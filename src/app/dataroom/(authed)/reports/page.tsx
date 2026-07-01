"use client";

import { useEffect, useState } from "react";

interface EstateOpt {
  slug: string;
  name: string;
}

export default function DataroomReportsPage() {
  const [estates, setEstates] = useState<EstateOpt[]>([]);
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/funder/reports/run");
      if (res.ok) {
        const data = await res.json();
        setEstates(data.estates || []);
        if (data.estates?.[0]) setSlug(data.estates[0].slug);
      }
    })();
  }, []);

  async function run() {
    if (!slug) return;
    setBusy(true);
    setErr(null);
    setReport(null);
    try {
      const res = await fetch("/api/funder/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (res.ok) setReport(data.report);
      else setErr(data.error || "Could not build the report");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">Demand reports</h1>
      <p className="text-sm text-slate-600 mb-5">
        Live buyer-demand evidence for an estate — the funnel from registered interest through to
        finance-ready buyers, drawn from real registrations. Figures are indicative and update as new
        buyers register.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Estate</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2.5 text-sm min-h-[44px]"
          >
            {estates.map((e) => (
              <option key={e.slug} value={e.slug}>{e.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={run}
          disabled={busy || !slug}
          className="bg-[#1B3A5B] hover:bg-[#14293f] text-white px-5 py-2.5 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Building…" : "Build report"}
        </button>
      </div>

      {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: Record<string, any> }) {
  const funnel: any[] = Array.isArray(report.funnel) ? report.funnel : [];
  const buyerMix: any[] = Array.isArray(report.buyerMix) ? report.buyerMix : [];
  const gaps: any[] = Array.isArray(report.gaps) ? report.gaps : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1B3A5B]">{report.estate?.name}</h2>
        <p className="text-xs text-slate-400">
          Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString("en-AU") : ""}
        </p>
        {report.dataError && (
          <p className="text-xs text-red-600 mt-1">{report.dataError}</p>
        )}
      </div>

      {funnel.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Demand funnel</h3>
          <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
            {funnel.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-600">{s.label ?? s.stage ?? s.name ?? `Stage ${i + 1}`}</span>
                <span className="font-semibold text-slate-900">{s.count ?? s.value ?? s.n ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {buyerMix.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Buyer mix</h3>
          <div className="flex flex-wrap gap-2">
            {buyerMix.map((b, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-1">
                {(b.label ?? b.name ?? b.category ?? "—")}: {(b.count ?? b.value ?? b.n ?? 0)}
              </span>
            ))}
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Not yet evidenced</h3>
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li key={i} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{g.label}</span>
                {g.reason ? ` — ${g.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
