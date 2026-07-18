import { redirect } from "next/navigation";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import EstateStatusManager from "@/components/admin/EstateStatusManager";

export const dynamic = "force-dynamic";

/**
 * /admin/estates — the estate-page on/off control. Lists every estate with an Activate/Deactivate
 * toggle. Deactivating archives the estate: it disappears from all public surfaces and its URL shows
 * a "page archived" notice (not a 404). Data is never deleted.
 */
export default async function AdminEstatesPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  if (!hasPermission(admin.role, "manage_estate_status")) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Estate Pages</h1>
        <p className="text-slate-600">
          You don&apos;t have permission to activate or deactivate estate pages. Ask a super admin or
          fund manager to make the change.
        </p>
      </div>
    );
  }

  return <EstateStatusManager />;
}
