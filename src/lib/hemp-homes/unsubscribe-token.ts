/**
 * Unsubscribe-token signing for Hemp Homes outreach emails. Spam Act 2003
 * requires a functional, no-login unsubscribe path; the token is the
 * mechanism that lets us identify which prospect to opt out without
 * forcing the recipient to authenticate.
 *
 * Format: <prospect_id>.<hmac-sha256(prospect_id, secret)-base64url>
 * Properties: no expiry (per Spam Act, unsubscribe links must remain
 * functional). Tokens are stable across regenerations — the same
 * prospect_id always produces the same token, so resending a follow-up
 * to a community that briefly considered unsubscribing doesn't break the
 * earlier link.
 *
 * Rotating HEMP_HOMES_UNSUBSCRIBE_SECRET invalidates every previously
 * sent link. Don't rotate casually.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const s = process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET;
  if (!s) {
    throw new Error("HEMP_HOMES_UNSUBSCRIBE_SECRET is not set");
  }
  return s;
}

function hmac(prospectId: string, secret: string): string {
  return createHmac("sha256", secret).update(prospectId).digest("base64url");
}

export function signUnsubscribeToken(prospectId: string): string {
  const sig = hmac(prospectId, getSecret());
  return `${prospectId}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { prospectId: string } | null {
  if (typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const prospectId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!prospectId || !sig) return null;

  const expected = hmac(prospectId, getSecret());
  // timingSafeEqual requires equal-length buffers — guard up front.
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  return { prospectId };
}

export function buildUnsubscribeUrl(prospectId: string, canonicalUrl?: string): string {
  const base = (canonicalUrl ?? process.env.NEXT_PUBLIC_CANONICAL_URL ?? "").replace(/\/$/, "");
  const token = signUnsubscribeToken(prospectId);
  return `${base}/hemp-homes/unsubscribe?t=${encodeURIComponent(token)}`;
}
