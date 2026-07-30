import { redirect } from "next/navigation";

/**
 * `/login` is the address people type from muscle memory, and it was a bare 404
 * with no route back — a returning admin's first impression was a dead end.
 * This app has no single login: /admin, /agent and /dataroom are separate
 * portals, so send the guess to the admin door, which carries links onward.
 */
export default function LoginRedirectPage() {
  redirect("/admin/login");
}
