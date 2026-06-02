/**
 * Recipient guard — keeps automated-tester and non-production email traffic
 * OUT of real recipients' inboxes.
 *
 * The problem: when an agent tester (/naive-tester, /qa) walks a public form,
 * each fake submission fires the same admin-notification fan-out that real
 * recipients (Uwe, agents, etc.) receive. Test junk lands in everyone's inbox.
 *
 * The rule (Dennis, 2026-05-26): test submissions are still recorded in the DB
 * + audit_log (internal record kept), but any OUTBOUND email is rerouted to a
 * single safe address — never the real recipient list. If anything is emailed,
 * it goes only to dennis@corporateaisolutions.com.
 *
 * Two reroute triggers:
 *   1. Non-production deploy — any VERCEL_ENV other than 'production' (preview,
 *      development, or unset/local). Catches a tester run against a preview URL.
 *   2. Test-traffic in production — the triggering submitter's email (or a
 *      recipient) is at a reserved test domain, or is the persistent QA account.
 *
 * This is a thin LOCAL chokepoint. Once a second product needs it, promote it
 * into @caistech/property-launch-kit (per the @caistech shared-services rule).
 */

/** Where rerouted mail goes. Override with TEST_EMAIL_REROUTE_TO. */
const REROUTE_TO =
  process.env.TEST_EMAIL_REROUTE_TO || "dennis@corporateaisolutions.com";

/**
 * Reserved test domains — submissions from these are treated as test traffic
 * in every environment. Override with TEST_EMAIL_DOMAINS (comma-separated).
 * Keep this list to addresses no real registrant would ever use.
 */
const DEFAULT_TEST_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "qa.factory2key.com.au",
];
const TEST_DOMAINS = (
  process.env.TEST_EMAIL_DOMAINS
    ? process.env.TEST_EMAIL_DOMAINS.split(",")
    : DEFAULT_TEST_DOMAINS
)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** The persistent automated-tester account is always test traffic. */
const QA_ACCOUNT = (
  process.env.QA_TEST_EMAIL || "qa@updates.corporateaisolutions.com"
).toLowerCase();

export function isTestEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at === -1) return false;
  if (e === QA_ACCOUNT) return true;
  return TEST_DOMAINS.includes(e.slice(at + 1));
}

/**
 * Non-production = any Vercel env that isn't 'production'. Unset (local node
 * scripts, `next dev`) is treated as non-prod so we fail safe — better to
 * reroute a real-looking local send to Dennis than to spam recipients.
 */
function isNonProduction(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/**
 * Demo mode — when DEMO_MODE=true, all outbound emails are rerouted to the
 * demo sink (or Dennis) to prevent self-serve demo users from sending real emails.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export type RecipientGuardResult = {
  /** The recipient list to actually send to. */
  to: string[];
  /** True when the original recipients were replaced. */
  rerouted: boolean;
  /** Why it was rerouted (for audit logging), or null when sent as-is. */
  reason: "non-production" | "test-actor" | "test-recipient" | "demo-mode" | null;
  /** The recipients the caller originally intended (for the audit trail). */
  original: string[];
};

/**
 * Resolve the effective recipients for an outbound send.
 *
 * @param to               the intended recipient(s)
 * @param triggeredByEmail the submitter/actor email this send is on behalf of
 *                         (e.g. the registrant), so production test-traffic is
 *                         caught even though the recipients are real people.
 */
export function guardRecipients(
  to: string | string[],
  opts?: { triggeredByEmail?: string | null },
): RecipientGuardResult {
  const original = (Array.isArray(to) ? to : [to]).filter(Boolean);

  let reason: RecipientGuardResult["reason"] = null;
  if (isDemoMode()) reason = "demo-mode";
  else if (isNonProduction()) reason = "non-production";
  else if (isTestEmail(opts?.triggeredByEmail)) reason = "test-actor";
  else if (original.some(isTestEmail)) reason = "test-recipient";

  if (reason) {
    return { to: [REROUTE_TO], rerouted: true, reason, original };
  }
  return { to: original, rerouted: false, reason: null, original };
}
