// The IANA zone for an Australian state — the estate's day, not the viewer's.
//
// The voice agent's prompt is baked at provisioning time, so it can never contain today's date on
// its own. The widget supplies `today`, and the ZONE is what decides which day "today" is: an
// estate in WA and a browser in UTC disagree for eight hours a day. Estate records already carry a
// structured `stateAbbr`, so deriving the zone from that keeps the date boundary aligned with the
// state the estate is actually in — never with the free-text `location` string, which is prose.

export const DEFAULT_TIME_ZONE = 'Australia/Perth';

const STATE_TIME_ZONE: Record<string, string> = {
  WA: 'Australia/Perth',
  NT: 'Australia/Darwin',
  SA: 'Australia/Adelaide',
  QLD: 'Australia/Brisbane',
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  TAS: 'Australia/Hobart',
  ACT: 'Australia/Sydney',
};

/** A state abbreviation → its IANA zone. Unknown/absent falls back to the F2K operating zone. */
export function timeZoneForStateAbbr(stateAbbr?: string | null): string {
  const key = String(stateAbbr ?? '').trim().toUpperCase();
  return STATE_TIME_ZONE[key] ?? DEFAULT_TIME_ZONE;
}
