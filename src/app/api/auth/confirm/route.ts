import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

// Cross-device-safe auth confirmation. Unlike /api/auth/callback (which calls
// exchangeCodeForSession and requires a PKCE verifier cookie set in the same
// browser that initiated the flow), this route verifies a token_hash directly
// against Supabase — so a user who requests a magic link on desktop can click
// the email on their phone (or in any other browser) and still land logged in.
//
// Requires the Supabase email templates to send token_hash links, e.g.
//   {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/admin
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_token`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't write cookies — middleware handles it.
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return NextResponse.redirect(
      `${origin}/admin/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
