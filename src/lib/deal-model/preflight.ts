/**
 * Startup preflight for the deal-model promotion (receive side).
 *
 * Runs once at server boot (via instrumentation.ts) so a missing secret surfaces in the logs
 * immediately, not only when DealFindrs POSTs a promotion and gets a fail-closed 500.
 * Warns only when the secret is missing — silent when correctly configured.
 */
export function preflightDealModelPromotion(): void {
  if (!process.env.DEAL_MODEL_PROMOTION_SECRET) {
    console.warn(
      "[deal-model] WARNING: promotion receiver is NOT configured — DEAL_MODEL_PROMOTION_SECRET is unset. " +
        "Incoming promotions from DealFindrs will be rejected with 500 (fail-closed) until it is set " +
        "(sensitive; prod+preview; identical value to DealFindrs). See docs/deal-model-promotion-step3.md.",
    );
  }
}
