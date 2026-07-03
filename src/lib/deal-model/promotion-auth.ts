import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shared-secret HMAC for the cross-repo deal-model promotion (DealFindrs -> F2K-Projects).
 *
 * The three repos run on separate infrastructure, so promotion is an authenticated HTTP hop.
 * Mirrors the portfolio convai-webhook discipline: the sender signs the raw JSON body with a
 * shared secret; the receiver verifies fail-closed (unset secret -> 500, bad signature -> 401).
 *
 * Header: `x-deal-model-signature: sha256=<hex>`.
 */
const PREFIX = "sha256=";

export function signPromotion(rawBody: string, secret: string): string {
  return PREFIX + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyPromotionSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = signPromotion(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Constant-time compare; length guard first (timingSafeEqual throws on unequal lengths).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
