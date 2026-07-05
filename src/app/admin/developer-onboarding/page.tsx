"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface GateResult {
  ok: boolean;
  reason: string;
}

// Mirrors the flattened summary stored on developer_onboarding.property_check by
// src/lib/property-check.ts (the first-pass @caistech/property-services derive).
interface PropertyCheck {
  status: "ok" | "skipped" | "error";
  ran_at: string;
  address?: string;
  reason?: string;
  summary?: string | null;
  wind_region?: string | null;
  wind_speed?: number | null;
  bal?: string | null;
  climate_zone?: string | null;
  lga_name?: string | null;
  lga_coverage?: string | null;
  zoning_code?: string | null;
  zoning_name?: string | null;
  modular_provisions?: string | null;
  subdivision_permitted?: boolean | null;
  max_lots?: number | null;
  buildability?: string | null;
  slope_percent?: number | null;
  lot_size?: number | null;
  parcel_id?: string | null;
  overlays?: Array<{ type: string; name: string; requiresReport: boolean }>;
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
  propertyCheck: PropertyCheck | null;
}

const VERDICT_BADGE: Record<string, string> = {
  GO: "bg-emerald-100 text-emerald-700",
  ADJUST: "bg-amber-100 text-amber-700",
  REJECT: "bg-red-100 text-red-700",
};

// Compact read-out of the stored first-pass property-services check (terrain, modular
// provisions, zoning, wind/BAL, lot) — the site DD captured with the enquiry but never shown
// before. Reads the flattened summary the onboarding route persists on property_check.
function SiteCheckPanel({ pc }: { pc: PropertyCheck | null }) {
  if (!pc || pc.status === "skipped") {
    return (
      <p className="text-xs text-slate-400">
        No automated site check{pc?.reason ? ` — ${pc.reason}` : " on this enquiry"}.
      </p>
    );
  }
  if (pc.status === "error") {
    return (
      <p className="text-xs text-amber-700">
        Site check couldn&apos;t run automatically{pc.reason ? `: ${pc.reason}` : "."} Worth a manual look.
      </p>
    );
  }
  const cell = (label: string, value: string | number | null | undefined) =>
    value || value === 0 ? (
      <div className="flex gap-2">
        <span className="w-40 shrink-0 text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">{String(value)}</span>
      </div>
    ) : null;
  const overlays = (pc.overlays ?? [])
    .map((o) => o.name + (o.requiresReport ? " (report required)" : ""))
    .join(", ");
  return (
    <div className="space-y-1 text-xs">
      {cell("Address used", pc.address)}
      {cell(
        "LGA / council",
        pc.lga_name
          ? `${pc.lga_name}${pc.lga_coverage && pc.lga_coverage !== "full" && pc.lga_coverage !== "none" ? ` (${pc.lga_coverage} coverage)` : ""}`
          : null,
      )}
      {cell(
        "Zoning",
        pc.zoning_code ? `${pc.zoning_code}${pc.zoning_name ? ` — ${pc.zoning_name}` : ""}` : null,
      )}
      {cell("Modular provisions", pc.modular_provisions)}
      {cell(
        "Buildability",
        pc.buildability
          ? `${pc.buildability}${pc.slope_percent != null ? ` (${pc.slope_percent}% slope)` : ""}`
          : pc.slope_percent != null
            ? `${pc.slope_percent}% slope`
            : null,
      )}
      {cell("Lot size", pc.lot_size != null ? `${pc.lot_size} m²` : null)}
      {cell("Parcel ID", pc.parcel_id)}
      {cell(
        "Subdivision permitted",
        pc.subdivision_permitted == null ? null : pc.subdivision_permitted ? "Yes" : "No",
      )}
      {cell("Est. max lots (Torrens)", pc.max_lots)}
      {cell(
        "Wind region",
        pc.wind_region ? `${pc.wind_region}${pc.wind_speed ? ` (${pc.wind_speed} m/s)` : ""}` : null,
      )}
      {cell("Bushfire (BAL)", pc.bal)}
      {cell("Climate zone", pc.climate_zone)}
      {cell("Overlays", overlays || null)}
      {pc.summary && <p className="mt-2 text-slate-600">{pc.summary}</p>}
    </div>
  );
}

export default function DeveloperOnboardingGatePage() {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
                <Fragment key={r.id}>
                <tr className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.estateName || "—"}</div>
                    <div className="text-xs text-slate-500">{r.developerName}</div>
                    {r.location && <div className="text-xs text-slate-400">{r.location}</div>}
                    <button
                      type="button"
                      onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                      className="mt-1 text-xs font-medium text-[#00B5AD] hover:underline"
                    >
                      {expandedId === r.id ? "Hide site check" : "Site check"}
                      {r.propertyCheck?.status === "ok" ? "" : r.propertyCheck?.status === "error" ? " (error)" : r.propertyCheck ? "" : " (none)"}
                    </button>
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
                {expandedId === r.id && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Automated site check (first-pass property-services)
                      </div>
                      <SiteCheckPanel pc={r.propertyCheck} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
