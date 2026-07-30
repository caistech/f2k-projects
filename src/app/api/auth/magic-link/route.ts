import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";

// Admin magic-link sender.
//
// The browser used to call supabase.auth.signInWithOtp directly, which relies
// on Supabase's built-in mailer. In this project that mailer fails every time
// with "Error sending magic link email" (no custom SMTP configured), so no
// admin ever received a link. Rather than depend on Supabase's mailer, we mint
// the sign-in token server-side with the service role and deliver it through
// the product's own verified Resend sender — the same reliable pipeline every
// other transactional email uses (src/lib/email/send.ts).
//
// The emailed link points at /api/auth/confirm, which verifies the token_hash
// device-independently with verifyOtp — exactly what that route is built for.
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    if (typeof body.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    // fall through to the empty-email guard
  }

  if (!email) {
    return NextResponse.json(
      { error: "Enter your email address first" },
      { status: 400 },
    );
  }

  const service = createSupabaseService();

  // Only send to a provisioned admin. Respond identically whether or not the
  // email is on the allowlist so this endpoint can't be used to enumerate admin
  // accounts.
  const { data: admin } = await service
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json(
      { error: "Could not generate a sign-in link. Please try again." },
      { status: 500 },
    );
  }

  const base = (
    process.env.NEXT_PUBLIC_CANONICAL_URL || new URL(request.url).origin
  ).replace(/\/$/, "");
  const confirmUrl =
    `${base}/api/auth/confirm` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=magiclink&next=${encodeURIComponent("/admin")}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email delivery is not configured. Contact your administrator." },
      { status: 500 },
    );
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Factory2Key Projects <noreply@updates.corporateaisolutions.com>";
  const subject = "Your Factory2Key Projects sign-in link";
  const html =
    `<p>Click the button below to sign in to Factory2Key Projects Admin.</p>` +
    `<p><a href="${confirmUrl}" style="display:inline-block;background:#0b1f3a;color:#fff;` +
    `padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>` +
    `<p>Or paste this link into your browser:</p>` +
    `<p><a href="${confirmUrl}">${confirmUrl}</a></p>` +
    `<p>This link can only be used once and expires shortly. ` +
    `If you didn't request it, you can safely ignore this email.</p>`;
  const text =
    `Sign in to Factory2Key Projects Admin:\n\n${confirmUrl}\n\n` +
    `This link can only be used once and expires shortly. ` +
    `If you didn't request it, ignore this email.`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({ from, to: email, subject, html, text });
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message ?? "Could not send the sign-in email." },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send the sign-in email." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
