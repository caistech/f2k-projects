import Link from "next/link";
import { getFunderMember } from "@/lib/funders/funder-auth";

export const dynamic = "force-dynamic";

export default async function DataroomOverviewPage() {
  const member = await getFunderMember();
  const firstName = (member?.full_name || "").split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">
        Factory2Key funder data room{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        A confidential space for the project documents and demand reports Factory2Key shares with
        funders. Everything here is provided for your assessment only and is commercial-in-confidence.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Link href="/dataroom/documents" className="block border border-slate-200 rounded-xl p-5 bg-white hover:border-[#1B3A5B] no-underline">
          <h2 className="font-semibold text-[#1B3A5B] mb-1">Documents</h2>
          <p className="text-sm text-slate-500">Project financials, plans and supporting material.</p>
        </Link>
        <Link href="/dataroom/reports" className="block border border-slate-200 rounded-xl p-5 bg-white hover:border-[#1B3A5B] no-underline">
          <h2 className="font-semibold text-[#1B3A5B] mb-1">Demand reports</h2>
          <p className="text-sm text-slate-500">Live buyer-demand evidence per estate.</p>
        </Link>
      </div>

      {member?.deep_access_enabled && !member?.nda_accepted_at && (
        <div className="mt-6 max-w-2xl border border-amber-200 bg-amber-50 rounded-xl p-4">
          <p className="text-sm text-amber-900">
            Deep-dive material is available to you once you accept the confidentiality undertaking.{" "}
            <Link href="/dataroom/nda" className="font-semibold underline">Review &amp; accept the NDA →</Link>
          </p>
        </div>
      )}
    </div>
  );
}
