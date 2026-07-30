import { redirect } from "next/navigation";

/**
 * Required. Without it Next prerenders this route static and Vercel serves a
 * CACHED 307 carrying an HTML body and NO Location header — so the redirect
 * silently lands nowhere, which is worse than the 404 it replaced. Verified in
 * production: `X-Vercel-Cache: HIT`, `Content-Length: 5896`, no Location.
 * (Same class as the documented @caistech/corporate-components re-export trap.)
 */
export const dynamic = "force-dynamic";

/**
 * `/login` is the address people type from muscle memory, and it was a bare 404
 * with no route back — a returning admin's first impression was a dead end.
 * This app has no single login: /admin, /agent and /dataroom are separate
 * portals, so send the guess to the admin door, which carries links onward.
 */
export default function LoginRedirectPage() {
  redirect("/admin/login");
}
