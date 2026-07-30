import { redirect } from "next/navigation";

/**
 * Belt-and-braces: middleware already forces /admin/* dynamic, so this route
 * redirects correctly today. Declared anyway so it cannot regress into the
 * cached-307-with-no-Location failure that hit /login if the matcher or the
 * public-route allowlist is ever reshaped.
 */
export const dynamic = "force-dynamic";

/**
 * The live route is /admin/reset-password. Both spellings get typed (and the
 * portfolio standard names this surface "password-reset"), so the wrong one must
 * not be a 404 — a returning admin hitting it has no way to tell they are one
 * hyphen from the page they want.
 */
export default function AdminPasswordResetAliasPage() {
  redirect("/admin/reset-password");
}
