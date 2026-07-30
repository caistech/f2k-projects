import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PreviewModeProvider } from "@/components/admin/PreviewModeProvider";
import { PreviewModeBanner } from "@/components/admin/PreviewModeBanner";
import { getAdminUser } from "@/lib/admin-auth";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";

  // Auth surfaces render without sidebar + auth check. /admin/password-reset is
  // the spelling alias and only redirects, so it must bypass the gate too or the
  // layout sends it to /admin/login before the redirect can run.
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/reset-password" ||
    pathname === "/admin/password-reset"
  ) {
    return <>{children}</>;
  }

  const adminUser = await getAdminUser();
  if (!adminUser) {
    // Distinguish "no session" from "signed in but not on the admin allowlist" —
    // a silent redirect on the latter looks like a login failure to the user.
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect(
        "/admin/login?error=" +
          encodeURIComponent(
            "This account isn't on the admin allowlist. Contact Dennis to be added.",
          ),
      );
    }
    redirect("/admin/login");
  }

  return (
    <PreviewModeProvider>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <AdminSidebar email={adminUser.email} />
        <div className="flex-1 flex flex-col">
          <PreviewModeBanner />
          <header className="bg-white border-b px-6 py-4 pl-16 lg:pl-6">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                Factory2Key Projects — Administration
              </h1>
              <span className="text-xs text-slate-500">
                {adminUser.role.replace("_", " ")}
              </span>
            </div>
          </header>
          {/*
            min-w-0 is load-bearing. A flex child defaults to min-width:auto, so
            wide content (the registrations table) forces this column wider than
            the viewport and the whole PAGE scrolls sideways instead of the table
            scrolling inside its own container. Measured before the fix: /admin
            871px wide at a 375px viewport, /admin/registrations 1335px at 375px
            and 1591px at 1440px — i.e. broken on a laptop too, not just a phone.
          */}
          <main className="p-6 flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </PreviewModeProvider>
  );
}
