/**
 * Magic-link requests for EXISTING accounts only.
 *
 * WHY THIS EXISTS
 * ---------------
 * `supabase.auth.signInWithOtp()` defaults to `shouldCreateUser: true`. Left at
 * the default — which all four of this app's login surfaces did — every login
 * form becomes an unauthenticated endpoint that will:
 *
 *   1. create an `auth.users` row for ANY address a stranger types, and
 *   2. email that address a branded "Sign in to F2K Projects" link,
 *
 * from our verified sending domain, on demand. That is a spam/phishing vector
 * riding our domain reputation, it fills auth.users with orphans that can never
 * pass the `admin_users` allowlist, and it burns the shared Supabase auth email
 * quota — which is what makes a REAL admin hit "you can only request this after
 * 32 seconds" while trying to get in.
 *
 * Found live on 2026-07-30: a tester typed an invented address into
 * /admin/login's magic-link box and it provisioned `rachel.brookes@…` and
 * mailed it. Nothing in the UI suggested an account had been created.
 *
 * THE ENUMERATION TRADE-OFF
 * -------------------------
 * With `shouldCreateUser: false`, GoTrue returns `otp_disabled` ("Signups not
 * allowed for otp") for an address with no account. Surfacing that verbatim
 * would turn the form into an account-enumeration oracle — a stranger could
 * discover exactly who holds admin accounts. So that ONE error is folded into
 * the same neutral "check your inbox" outcome a real send produces. The account
 * is not created either way; only the wording is deliberately uninformative.
 *
 * Throttling is reported separately (`throttled`) rather than as a generic
 * error, because Supabase applies ONE per-address timer across magic-link AND
 * password-reset: requesting a magic link silently closes the reset door for a
 * minute, and showing that in a login-error slot reads as "your sign-in is
 * blocked" when nothing is wrong with the credentials.
 */

/**
 * Structurally typed so this helper works with whichever Supabase client a
 * surface already builds (`createBrowserClient` directly, or the app's
 * `browserClient()` wrapper) without coupling to a client generic or SDK major.
 */
type OtpCapableClient = {
  auth: {
    signInWithOtp(args: {
      email: string;
      options?: { emailRedirectTo?: string; shouldCreateUser?: boolean };
    }): Promise<{ error: { message: string; code?: string; status?: number } | null }>;
  };
};

export type MagicLinkOutcome =
  | { kind: "sent" }
  | { kind: "throttled"; retryAfterSeconds: number | null; message: string }
  | { kind: "error"; message: string };

/** GoTrue's "that address has no account and I won't make one" signal. */
function isNoSuchAccount(error: { message: string; code?: string }): boolean {
  if (error.code === "otp_disabled") return true;
  return /signups?\s+not\s+allowed/i.test(error.message);
}

/** GoTrue's per-address cooldown, shared between magic-link and password-reset. */
function parseThrottle(error: { message: string; code?: string; status?: number }):
  | { retryAfterSeconds: number | null }
  | null {
  const throttled =
    error.code === "over_email_send_rate_limit" ||
    error.status === 429 ||
    /only request this after/i.test(error.message);
  if (!throttled) return null;
  const seconds = error.message.match(/after\s+(\d+)\s*seconds?/i);
  return { retryAfterSeconds: seconds ? Number(seconds[1]) : null };
}

/**
 * If `error` is the shared per-address email cooldown, return a message that
 * says so; otherwise null. Exported because the password-reset path is governed
 * by the SAME timer and was reporting it as a credential error.
 */
export function throttleMessageFor(error: {
  message: string;
  code?: string;
  status?: number;
}): string | null {
  const throttle = parseThrottle(error);
  if (!throttle) return null;
  const wait =
    throttle.retryAfterSeconds === null ? "a moment" : `${throttle.retryAfterSeconds} seconds`;
  return `An email was already sent to this address. You can request another in ${wait} — the same timer covers both sign-in and password-reset emails.`;
}

/**
 * Send a magic link to `email` if — and only if — an account already exists.
 *
 * Never creates an account. An unknown address returns `{ kind: "sent" }` by
 * design (see "THE ENUMERATION TRADE-OFF" above): the caller shows its normal
 * confirmation and no account comes into existence.
 */
export async function requestMagicLink(
  supabase: OtpCapableClient,
  email: string,
  redirectTo: string,
): Promise<MagicLinkOutcome> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });

  if (!error) return { kind: "sent" };
  if (isNoSuchAccount(error)) return { kind: "sent" };

  const throttle = parseThrottle(error);
  if (throttle) {
    const wait =
      throttle.retryAfterSeconds === null
        ? "a moment"
        : `${throttle.retryAfterSeconds} seconds`;
    return {
      kind: "throttled",
      retryAfterSeconds: throttle.retryAfterSeconds,
      // Names the shared timer, because the reset link the user is about to
      // reach for is throttled by the same clock and nothing else says so.
      message: `A sign-in email was already sent to this address. You can request another in ${wait} — this also covers password-reset emails.`,
    };
  }

  return { kind: "error", message: error.message };
}
