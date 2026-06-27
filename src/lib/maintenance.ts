import { NextResponse } from "next/server";

/**
 * Registration write freeze.
 *
 * When the env var `REGISTRATIONS_PAUSED` is "true", the public lead-capture
 * endpoints briefly reject new submissions. This exists for the Supabase
 * region cutover (Seoul -> Sydney): during the short cutover window the forms
 * are frozen so no registration lands between the final data sync and the
 * env flip, then the flag is cleared. Default OFF (unset) — a normal deploy
 * behaves exactly as before.
 */
export function registrationsPaused(): boolean {
  return process.env.REGISTRATIONS_PAUSED === "true";
}

export const REGISTRATIONS_PAUSED_MESSAGE =
  "Registrations are paused for a few minutes for scheduled maintenance. " +
  "Your details have not been submitted — please try again shortly.";

/**
 * Drop-in guard for a public write route's POST handler. Returns a 503
 * response when the freeze is on (so the caller returns early and nothing is
 * written), or null when registrations are open.
 *
 *   const paused = registrationsMaintenanceGuard();
 *   if (paused) return paused;
 */
export function registrationsMaintenanceGuard(): NextResponse | null {
  if (!registrationsPaused()) return null;
  return NextResponse.json(
    { error: REGISTRATIONS_PAUSED_MESSAGE, paused: true },
    { status: 503, headers: { "Retry-After": "600" } },
  );
}
