import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed one-click "I've told my clients" token for an estate status notification.
 *
 * When an estate is deactivated the system deliberately does not contact registrants — their
 * introducing agent decides whether and how to tell them (see stakeholders.ts). That makes the last
 * step of the process happen entirely outside this system, so without a way for the agent to report
 * back, the most an operator could ever know is "the agents were emailed" — never whether the
 * buyers actually heard.
 *
 * The token closes that loop with the least possible friction: one click from the email, no login.
 * It is scoped to a single notification row and only ever sets acknowledged_at, so the worst a
 * leaked token can do is mark one agent's notice as acknowledged — the same direction of failure
 * an unsubscribe link accepts, and the one that is safe to get wrong.
 *
 * Signing key: HEMP_HOMES_UNSUBSCRIBE_SECRET, reused as the repo's generic HMAC key (the name is
 * historical — see lib/estates/email.ts, which already treats it that way). Unset => tokens are
 * unavailable and the email ships WITHOUT the confirm button rather than failing the send: an
 * unconfigured secret must not cost an agent their notification.
 */

const PREFIX = "estate-status-ack";

function secret(): string | null {
  return process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET || null;
}

function hmac(payload: string, key: string): string {
  return createHmac("sha256", key).update(`${PREFIX}:${payload}`).digest("base64url");
}

/** Sign an acknowledgement token for a notification row. Null when no signing key is configured. */
export function signStatusAckToken(notificationId: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(notificationId, "utf-8").toString("base64url");
  return `${payload}.${hmac(payload, key)}`;
}

/** Verify a token and return the notification id, or null if it is missing/invalid/unsigned. */
export function verifyStatusAckToken(token: string): string | null {
  const key = secret();
  if (!key || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload || !sig) return null;
  const expected = hmac(payload, key);
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  const id = Buffer.from(payload, "base64url").toString("utf-8");
  return id || null;
}

/** The confirm URL placed in the agent's email. Null when tokens are unavailable. */
export function buildStatusAckUrl(notificationId: string): string | null {
  const token = signStatusAckToken(notificationId);
  if (!token) return null;
  const base = (
    process.env.NEXT_PUBLIC_CANONICAL_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");
  if (!base) return null;
  return `${base}/api/estates/status-ack?t=${encodeURIComponent(token)}`;
}
