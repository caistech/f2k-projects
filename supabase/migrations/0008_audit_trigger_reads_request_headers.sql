-- F2K-Projects — Audit attribution from PostgREST request headers
--
-- Problem: the Supabase JS client (used by Next.js admin endpoints) can't run
-- SET LOCAL inside its connection. So the trigger from 0005 falls back to
-- actor_email='system' and reason=NULL for every UPDATE/INSERT/DELETE the
-- admin panel writes — wasting the per-field audit infrastructure.
--
-- Fix: update audit_entity_change() to ALSO read from
--   current_setting('request.headers')::jsonb
-- which PostgREST populates with the incoming request headers (lowercase
-- keys) on every connection. The admin endpoints send:
--   x-actor-email: <admin's email>
--   x-audit-reason: <reason text>
-- on their service-role client and the trigger picks them up automatically.
--
-- Order of precedence inside the trigger:
--   1. SET LOCAL app.actor_id / app.actor_email / app.audit_reason
--      (used by migration scripts and direct psql)
--   2. PostgREST request headers
--   3. Fallback: actor_email='system', reason=NULL (unattributed write)
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Triggers stay attached.
-- Non-destructive: doesn't change the audit_log table, only the trigger body.

CREATE OR REPLACE FUNCTION audit_entity_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_reason      TEXT;
  v_headers     JSONB;
  v_entity_id   UUID := NULL;
  v_lot_number  INTEGER := NULL;
  v_old_json    JSONB;
  v_new_json    JSONB;
  v_key         TEXT;
  v_details     JSONB := '{}'::jsonb;
BEGIN
  -- 1. Session-local SET LOCAL (psql / migration scripts)
  BEGIN
    v_actor_id := NULLIF(current_setting('app.actor_id', TRUE), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;
  v_actor_email := NULLIF(current_setting('app.actor_email', TRUE), '');
  v_reason      := NULLIF(current_setting('app.audit_reason', TRUE), '');

  -- 2. Fall back to PostgREST request headers if either is still NULL
  IF v_actor_email IS NULL OR v_reason IS NULL THEN
    BEGIN
      v_headers := current_setting('request.headers', TRUE)::JSONB;
    EXCEPTION WHEN OTHERS THEN
      v_headers := NULL;
    END;

    IF v_headers IS NOT NULL THEN
      v_actor_email := COALESCE(
        v_actor_email,
        NULLIF(v_headers->>'x-actor-email', '')
      );
      v_reason := COALESCE(
        v_reason,
        NULLIF(v_headers->>'x-audit-reason', '')
      );
    END IF;
  END IF;

  -- Entity-key extraction depends on the table.
  IF TG_TABLE_NAME = 'seafields_lot_allocations' THEN
    IF TG_OP = 'DELETE' THEN
      v_lot_number := OLD.lot_number;
    ELSE
      v_lot_number := NEW.lot_number;
    END IF;
    v_details := jsonb_build_object('lot_number', v_lot_number);
  ELSIF TG_TABLE_NAME = 'stages' THEN
    IF TG_OP = 'DELETE' THEN
      v_entity_id := OLD.id;
    ELSE
      v_entity_id := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'seafields_registration_lots' THEN
    IF TG_OP = 'DELETE' THEN
      v_entity_id := OLD.id;
      v_details := jsonb_build_object(
        'registration_id', OLD.registration_id,
        'lot_number',      OLD.lot_number
      );
    ELSE
      v_entity_id := NEW.id;
      v_details := jsonb_build_object(
        'registration_id', NEW.registration_id,
        'lot_number',      NEW.lot_number
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    FOR v_key IN SELECT jsonb_object_keys(v_old_json) LOOP
      IF v_key IN ('updated_at') THEN
        CONTINUE;
      END IF;

      IF (v_old_json -> v_key) IS DISTINCT FROM (v_new_json -> v_key) THEN
        INSERT INTO audit_log (
          actor_id, actor_email, action, entity_type, entity_id,
          field_changed, old_value, new_value, reason, details
        ) VALUES (
          v_actor_id,
          COALESCE(v_actor_email, 'system'),
          'UPDATE_' || TG_TABLE_NAME,
          TG_TABLE_NAME,
          v_entity_id,
          v_key,
          v_old_json -> v_key,
          v_new_json -> v_key,
          v_reason,
          v_details
        );
      END IF;
    END LOOP;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      actor_id, actor_email, action, entity_type, entity_id,
      new_value, reason, details
    ) VALUES (
      v_actor_id,
      COALESCE(v_actor_email, 'system'),
      'INSERT_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      v_entity_id,
      to_jsonb(NEW),
      v_reason,
      v_details
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      actor_id, actor_email, action, entity_type, entity_id,
      old_value, reason, details
    ) VALUES (
      v_actor_id,
      COALESCE(v_actor_email, 'system'),
      'DELETE_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      v_entity_id,
      to_jsonb(OLD),
      v_reason,
      v_details
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION audit_entity_change IS
  'Generic AFTER-trigger that writes one audit_log row per changed field on UPDATE, or one row per INSERT/DELETE. Reads actor (app.actor_id, app.actor_email) and reason (app.audit_reason) from session variables first, then falls back to PostgREST request headers (x-actor-email, x-audit-reason). SECURITY DEFINER with pinned search_path.';
