import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const supabase = createSupabaseService();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy mb-6">Audit Log</h2>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries && entries.length > 0 ? (
              entries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.actor_email || "system"}</td>
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.entity_type}{entry.entity_id ? ` (${String(entry.entity_id).slice(0, 8)}...)` : ""}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                    {JSON.stringify(entry.details)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
