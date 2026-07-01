import { redirect } from "next/navigation";
import { getFunderMember } from "@/lib/funders/funder-auth";
import { DataroomNav } from "@/components/funders/DataroomNav";

export const dynamic = "force-dynamic";

/**
 * Authed funder data-room gate. Middleware requires a session for /dataroom/*; this layout is the
 * SECOND gate — only an ACTIVE funder_members row gets in, so a revoked/invited-only member or any
 * non-funder auth user (admins, agents) is bounced to the data-room login.
 */
export default async function DataroomLayout({ children }: { children: React.ReactNode }) {
  const member = await getFunderMember();
  if (!member) redirect("/dataroom/login");

  const ndaPending = member.deep_access_enabled && !member.nda_accepted_at;

  return (
    <div className="min-h-screen bg-slate-50">
      <DataroomNav
        name={member.full_name || member.email}
        firm={member.firm}
        ndaPending={ndaPending}
      />
      <main className="md:ml-60 p-4 py-6 max-w-5xl">{children}</main>
    </div>
  );
}
