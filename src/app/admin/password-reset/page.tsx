import { redirect } from "next/navigation";

/**
 * The live route is /admin/reset-password. Both spellings get typed (and the
 * portfolio standard names this surface "password-reset"), so the wrong one must
 * not be a 404 — a returning admin hitting it has no way to tell they are one
 * hyphen from the page they want.
 */
export default function AdminPasswordResetAliasPage() {
  redirect("/admin/reset-password");
}
