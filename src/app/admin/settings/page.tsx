import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Your settings</h2>
        <p className="text-sm text-slate-600 mt-1">
          Update your profile, change your password, and choose how you receive
          email from Factory2Key Projects. Changes save per-section.
        </p>
      </header>

      <SettingsForm
        initial={{
          email: admin.email,
          role: admin.role,
          first_name: admin.first_name ?? "",
          last_name: admin.last_name ?? "",
          phone: admin.phone ?? "",
          company: admin.company ?? "",
          job_title: admin.job_title ?? "",
          email_marketing_opt_in: admin.email_marketing_opt_in,
        }}
      />
    </div>
  );
}
