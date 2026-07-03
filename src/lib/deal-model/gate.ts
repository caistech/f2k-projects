/**
 * The estate-page build gate.
 *
 * An estate cannot be built until BOTH are true:
 *   1. a received deal-model promotion whose verdict is NOT REJECT (i.e. GO or ADJUST), and
 *   2. the developer's title is present (site controlled + a title document uploaded).
 *
 * This is enforcement, not advice: the admin "clear for build" action must call `canBuildEstate`
 * server-side and refuse when it returns ok:false. An un-GO'd or title-less deal cannot progress.
 */

/** site_control values that count as "controlled" for the title gate. */
const CONTROLLED = new Set([
  "owned",
  "under_option",
  "under option",
  "secured",
  "option",
]);

interface OnboardingTitleFields {
  site_control?: string | null;
  uploads?: Array<{ name?: string; category?: string }> | null;
}

/** True when the developer has both site control and a title-category document on file. */
export function hasTitleEvidence(onboarding: OnboardingTitleFields): boolean {
  const controlled = CONTROLLED.has((onboarding.site_control ?? "").trim().toLowerCase());
  const uploads = Array.isArray(onboarding.uploads) ? onboarding.uploads : [];
  const hasTitleDoc = uploads.some(
    (u) =>
      /title|deposited\s*plan|certificate/i.test(u?.category ?? "") ||
      /title|deposited\s*plan|certificate/i.test(u?.name ?? ""),
  );
  return controlled && hasTitleDoc;
}

export type GateVerdict = "GO" | "ADJUST" | "REJECT";

export interface GateResult {
  ok: boolean;
  reason: string;
}

/** The enforced decision. Verdict governs; title is a hard co-requisite. */
export function canBuildEstate(args: {
  verdict: GateVerdict | null | undefined;
  titlePresent: boolean;
}): GateResult {
  if (!args.verdict) {
    return { ok: false, reason: "No deal-model verdict received yet — run and promote the deal first." };
  }
  if (args.verdict === "REJECT") {
    return { ok: false, reason: "Deal verdict is STOP (REJECT) — not cleared to build." };
  }
  if (!args.titlePresent) {
    return { ok: false, reason: "Title not present — site control + a title document are required before build." };
  }
  return { ok: true, reason: `Cleared: verdict ${args.verdict} with title present.` };
}
