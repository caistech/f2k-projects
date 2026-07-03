"use client";

import { useCallback, useEffect, useState } from "react";

interface GateResult {
  ok: boolean;
  reason: string;
}

interface OnboardingRow {
  id: string;
  developerName: string;
  estateName: string;
  location: string | null;
  status: string;
  siteControl: string | null;
  createdAt: string;
  verdict: "GO" | "ADJUST" | "REJECT" | null;
  snapshotVersion: number | null;
  titlePresent: boolean;
  gate: GateResult;
  clearedForBuildAt: string | null;
  clearedForBuildBy: string | null;
}

const VERDICT_BADGE: Record<string, string> = {
  GO: "bg-emerald-100 text-emerald-700",
  ADJUST: "bg-amber-100 text-amber-700",
  REJECT: "bg-red-100 text-red-700",
};

export default function DeveloperOnboardingGatePage() {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/developer-onboarding");
      if (res.ok) setRows((await res.json()).onboardings || []);
      else setMsg({ type: "error", text: "Failed to load" });
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function clearForBuild(row: OnboardingRow) {
    if (
      !confirm(
        `Clear "${row.estateName}" for estate-page build?\n\nThis records that the deal cleared the gate (verdict ${row.verdict}, title present) and green-lights building the estate page. It is logged against your account.`,
      )
    )
      return;
    setBusyId(row.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/deal-model/clear-for-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingId: row.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: `${row.estateName} cleared for build` });
        load();
      } else if (res.status === 409) {
        setMsg({ type: "error", text: `Blocked: ${data.reason || "gate not satisfied"}` });
      } else {
        setMsg({ type: "error", text: data.error || "Clear failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Developer onboarding &mdash; build gate</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Estates submitted through the developer onboarding form, with their deal-model gate status.
        An estate can only be cleared for its estate-page build once the deal has a non-STOP verdict
        (GO or ADJUST) from DealFindrs <strong>and</strong> the developer&apos;s title is present. The
        &ldquo;Clear for build&rdquo; action is blocked until both hold &mdash; that is the enforced
        green light, not a suggestion.
      </p>

      {msg && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading&hellip;</div>
      ) : rows.length === 0 ? (
        <div className="text-slate-400 text-sm border border-dashed rounded p-6 text-center">
          No developer onboarding submissions yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Estate / developer</th>
                <th className="text-left px-4 py-3 font-semibold">Verdict</th>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Build gate</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.estateName || "—"}</div>
                    <div className="text-xs text-slate-500">{r.developerName}</div>
                    {r.location && <div className="text-xs text-slate-400">{r.location}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {r.verdict ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${VERDICT_BADGE[r.verdict]}`}>
                        {r.verdict}
                        {r.snapshotVersion != null && <span className="font-normal"> v{r.snapshotVersion}</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">no promotion</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${r.titlePresent ? "text-emerald-600" : "text-slate-400"}`}>
                      {r.titlePresent ? "present" : "missing"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.clearedForBuildAt ? (
                      <div className="text-xs text-emerald-700">
                        Cleared {new Date(r.clearedForBuildAt).toLocaleDateString()}
                        {r.clearedForBuildBy && <div className="text-slate-400">by {r.clearedForBuildBy}</div>}
                      </div>
                    ) : (
                      <span className={`text-xs ${r.gate.ok ? "text-emerald-600" : "text-slate-500"}`}>
                        {r.gate.ok ? "Ready to clear" : r.gate.reason}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.clearedForBuildAt ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        onClick={() => clearForBuild(r)}
                        disabled={!r.gate.ok || busyId === r.id}
                        title={r.gate.ok ? "Clear this estate for build" : r.gate.reason}
                        className="text-xs px-3 py-1.5 min-h-[36px] rounded font-medium bg-[#00B5AD] hover:bg-[#009a93] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {busyId === r.id ? "Clearing…" : "Clear for build"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
