-- F2K-Projects — Seafields launch schema, part 8
-- email_templates table + 5 seed rows for the Resend-driven notification
-- flows wired in F2KSFLDS-9.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT … ON CONFLICT DO NOTHING.
-- Non-destructive: catalogue table only, no existing schema affected.
--
-- The admin /admin/email-templates page is the editor; src/lib/email/send.ts
-- is the consumer. Audit attribution flows through the migration 0008
-- request-header trigger like every other admin-managed table.

CREATE TABLE IF NOT EXISTS email_templates (
  slug          TEXT PRIMARY KEY
    CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
  subject       TEXT NOT NULL,
  html_body     TEXT NOT NULL,
  text_body     TEXT,
  -- jsonb array of variable names the template expects, e.g.
  -- ["first_name", "lot_list", "interest_type"]. Free-form documentation —
  -- send.ts validates by attempting interpolation, not by enforcing this.
  variables     JSONB NOT NULL DEFAULT '[]'::jsonb,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_email_templates" ON email_templates;
CREATE POLICY "service_role_all_email_templates"
  ON email_templates FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- =====================================================================
-- SEEDS — five Seafields notification flows
-- =====================================================================
-- HTML uses inline styles consistent with the existing registration emails
-- in /api/seafields/register/route.ts. Variables in {{double_curlies}}
-- are interpolated by src/lib/email/send.ts with HTML-escaped values.
-- Lists (lot_list, etc.) come pre-rendered as comma-separated text.

INSERT INTO email_templates (slug, subject, html_body, text_body, variables, description) VALUES

(
  'registration_confirmation',
  'Seafields Estate — Registration of Interest Confirmed',
  $HTML$<div style="max-width:600px;font-family:sans-serif">
  <div style="background:#1A2744;padding:24px 32px">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px">Seafields Estate</h1>
    <p style="color:#00B5AD;margin:4px 0 0;font-size:13px">A Factory2Key Development</p>
  </div>
  <div style="padding:32px;background:#FFFFFF">
    <p style="font-size:16px;color:#1A2744">Hi {{first_name}},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Thank you for registering your interest in Seafields Estate, Waggrakine WA.
      We've noted your interest in the following lot(s):
    </p>
    <div style="background:#F5F3EE;padding:16px 20px;margin:16px 0;font-size:16px;font-weight:bold;color:#1A2744">
      {{lot_list}}
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      This is a registration of interest only — no deposit or commitment is required.
      We'll keep you informed as the project progresses.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      If you have any questions, contact Dennis McMahon at
      <a href="mailto:dennis@factory2key.com.au">dennis@factory2key.com.au</a>
      or +61 402 612 471.
    </p>
    <p style="font-size:14px;color:#1A2744;margin-top:24px">
      Kind regards,<br>
      <strong>Factory2Key Pty Ltd</strong>
    </p>
  </div>
  <div style="background:#F5F3EE;padding:16px 32px;font-size:11px;color:#999">
    Seafields Estate — Pepper Gate, Waggrakine WA 6530<br>
    A Factory2Key residential development
  </div>
</div>$HTML$,
  $TXT$Hi {{first_name}},

Thank you for registering your interest in Seafields Estate, Waggrakine WA.
We've noted your interest in: {{lot_list}}.

This is a registration of interest only — no deposit or commitment is required.
We'll keep you informed as the project progresses.

Questions? Reach Dennis McMahon at dennis@factory2key.com.au or +61 402 612 471.

Kind regards,
Factory2Key Pty Ltd
Seafields Estate — Pepper Gate, Waggrakine WA 6530$TXT$,
  '["first_name", "lot_list"]'::jsonb,
  'Sent to the registrant immediately after a successful public ROI submission. Confirms receipt and lists the selected lots.'
),

(
  'lot_reserved_notice',
  'Seafields Estate — Update on Lot {{lot_number}}',
  $HTML$<div style="max-width:600px;font-family:sans-serif">
  <div style="background:#1A2744;padding:24px 32px">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px">Seafields Estate</h1>
    <p style="color:#00B5AD;margin:4px 0 0;font-size:13px">Lot status update</p>
  </div>
  <div style="padding:32px;background:#FFFFFF">
    <p style="font-size:16px;color:#1A2744">Hi {{first_name}},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Lot <strong>{{lot_number}}</strong> at Seafields Estate has just been
      <strong>reserved</strong>. {{registration_type_message}}
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      If you have any questions or would like to explore alternative lots,
      contact Dennis McMahon at
      <a href="mailto:dennis@factory2key.com.au">dennis@factory2key.com.au</a>
      or +61 402 612 471.
    </p>
    <p style="font-size:14px;color:#1A2744;margin-top:24px">
      Kind regards,<br>
      <strong>Factory2Key Pty Ltd</strong>
    </p>
  </div>
  <div style="background:#F5F3EE;padding:16px 32px;font-size:11px;color:#999">
    Seafields Estate — Pepper Gate, Waggrakine WA 6530
  </div>
</div>$HTML$,
  $TXT$Hi {{first_name}},

Lot {{lot_number}} at Seafields Estate has just been reserved.

{{registration_type_message}}

Questions? Reach Dennis at dennis@factory2key.com.au or +61 402 612 471.

Factory2Key Pty Ltd$TXT$,
  '["first_name", "lot_number", "registration_type_message"]'::jsonb,
  'Sent when an admin transitions a lot from available → reserved. registration_type_message differs for primary vs backup_list registrants (use the send.ts helper to pick the right copy per recipient).'
),

(
  'lot_released_notice',
  'Seafields Estate — Lot {{lot_number}} is now available',
  $HTML$<div style="max-width:600px;font-family:sans-serif">
  <div style="background:#1A2744;padding:24px 32px">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px">Seafields Estate</h1>
    <p style="color:#00B5AD;margin:4px 0 0;font-size:13px">Lot released</p>
  </div>
  <div style="padding:32px;background:#FFFFFF">
    <p style="font-size:16px;color:#1A2744">Hi {{first_name}},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Lot <strong>{{lot_number}}</strong> at Seafields Estate has just been
      <strong>released</strong> back to the available pool. You are currently
      <strong>position {{position_in_queue}}</strong> in the backup list.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      If you would like to convert your backup-list registration into a
      primary registration on this lot, contact Dennis McMahon at
      <a href="mailto:dennis@factory2key.com.au">dennis@factory2key.com.au</a>
      or +61 402 612 471.
    </p>
    <p style="font-size:14px;color:#1A2744;margin-top:24px">
      Kind regards,<br>
      <strong>Factory2Key Pty Ltd</strong>
    </p>
  </div>
  <div style="background:#F5F3EE;padding:16px 32px;font-size:11px;color:#999">
    Seafields Estate — Pepper Gate, Waggrakine WA 6530
  </div>
</div>$HTML$,
  $TXT$Hi {{first_name}},

Lot {{lot_number}} at Seafields Estate has just been released back to the available pool. You are currently position {{position_in_queue}} in the backup list.

To convert to a primary registration on this lot, reach Dennis at dennis@factory2key.com.au or +61 402 612 471.

Factory2Key Pty Ltd$TXT$,
  '["first_name", "lot_number", "position_in_queue"]'::jsonb,
  'Sent when an admin transitions a lot from reserved → available. Fans out to every backup_list registrant on that lot, with their current position_in_queue.'
),

(
  'stage_advanced_notice',
  'Seafields Estate — Stage {{stage_number}} is now open for registration',
  $HTML$<div style="max-width:600px;font-family:sans-serif">
  <div style="background:#1A2744;padding:24px 32px">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px">Seafields Estate</h1>
    <p style="color:#00B5AD;margin:4px 0 0;font-size:13px">Stage release update</p>
  </div>
  <div style="padding:32px;background:#FFFFFF">
    <p style="font-size:16px;color:#1A2744">Hi {{first_name}},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      <strong>Stage {{stage_number}} ({{stage_label}}) is now open for
      registration</strong>. As an existing registered party on an earlier
      stage, your <strong>price is locked at {{locked_rate}}/m²</strong> for
      the lots you have already registered on.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      New registrants entering on Stage {{stage_number}} will pay the
      current ladder rate — your earlier registration preserves the lower
      price you signed up at.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Questions or want to extend your registration to a Stage
      {{stage_number}} lot? Reach Dennis McMahon at
      <a href="mailto:dennis@factory2key.com.au">dennis@factory2key.com.au</a>
      or +61 402 612 471.
    </p>
    <p style="font-size:14px;color:#1A2744;margin-top:24px">
      Kind regards,<br>
      <strong>Factory2Key Pty Ltd</strong>
    </p>
  </div>
  <div style="background:#F5F3EE;padding:16px 32px;font-size:11px;color:#999">
    Seafields Estate — Pepper Gate, Waggrakine WA 6530
  </div>
</div>$HTML$,
  $TXT$Hi {{first_name}},

Stage {{stage_number}} ({{stage_label}}) at Seafields Estate is now open for registration. Your price is locked at {{locked_rate}}/m² for the lots you have already registered on — new registrants on Stage {{stage_number}} will pay the current ladder rate.

Questions? Reach Dennis at dennis@factory2key.com.au or +61 402 612 471.

Factory2Key Pty Ltd$TXT$,
  '["first_name", "stage_number", "stage_label", "locked_rate"]'::jsonb,
  'Sent when an admin toggles is_open_for_registration on a stage from false → true. Fans out to active primary registrants of earlier stages so they know their locked rate is now below the new ladder rate.'
),

(
  'queue_position_updated',
  'Seafields Estate — Your queue position on Lot {{lot_number}} has changed',
  $HTML$<div style="max-width:600px;font-family:sans-serif">
  <div style="background:#1A2744;padding:24px 32px">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px">Seafields Estate</h1>
    <p style="color:#00B5AD;margin:4px 0 0;font-size:13px">Queue position update</p>
  </div>
  <div style="padding:32px;background:#FFFFFF">
    <p style="font-size:16px;color:#1A2744">Hi {{first_name}},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Your backup-list position on <strong>Lot {{lot_number}}</strong> has
      moved from position <strong>{{old_position}}</strong> to position
      <strong>{{new_position}}</strong>.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6">
      Lower positions are notified first when a lot is released. If you
      would like to update your interest or convert your registration on
      this lot, contact Dennis McMahon at
      <a href="mailto:dennis@factory2key.com.au">dennis@factory2key.com.au</a>
      or +61 402 612 471.
    </p>
    <p style="font-size:14px;color:#1A2744;margin-top:24px">
      Kind regards,<br>
      <strong>Factory2Key Pty Ltd</strong>
    </p>
  </div>
  <div style="background:#F5F3EE;padding:16px 32px;font-size:11px;color:#999">
    Seafields Estate — Pepper Gate, Waggrakine WA 6530
  </div>
</div>$HTML$,
  $TXT$Hi {{first_name}},

Your backup-list position on Lot {{lot_number}} has moved from {{old_position}} to {{new_position}}. Lower positions are notified first when a lot is released.

Questions? Reach Dennis at dennis@factory2key.com.au or +61 402 612 471.

Factory2Key Pty Ltd$TXT$,
  '["first_name", "lot_number", "old_position", "new_position"]'::jsonb,
  'Sent when a backup_list registrant''s position_in_queue changes due to someone ahead releasing or cancelling. Fired by the lot-released path in /api/admin/seafields/allocations after the position trigger reorders.'
)

ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE email_templates IS
  'Resend-driven notification templates for the Seafields flows. Edit via /admin/email-templates. Consumed by src/lib/email/send.ts which interpolates {{var}} placeholders with HTML-escaped values and writes an audit_log row per send.';

COMMENT ON COLUMN email_templates.variables IS
  'Free-form jsonb array documenting expected variable names. Not enforced by the DB; the send.ts helper handles missing variables by leaving the placeholder unrendered and logs a warning.';
