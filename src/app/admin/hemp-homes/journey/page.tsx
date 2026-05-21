// @explanatory-header-exempt — nested workflow page; entry-point header lives on /admin/hemp-homes
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HEMP_HOMES_STAGES,
  HEMP_HOMES_STATES,
  type HempHomesJourneyEntry,
  type HempHomesStage,
  type HempHomesState,
} from "@/lib/hemp-homes/types";

function StageBadge({ stage }: { stage: HempHomesStage }) {
  const label = HEMP_HOMES_STAGES.find((s) => s.value === stage)?.label ?? stage;
  return (
    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
      {label}
    </span>
  );
}

function StateBadge({ state }: { state: HempHomesState }) {
  const label = HEMP_HOMES_STATES.find((s) => s.value === state)?.label ?? state;
  const cls =
    state === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : state === "in_progress"
      ? "bg-blue-100 text-blue-800"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function HempHomesJourneyPage() {
  const [entries, setEntries] = useState<HempHomesJourneyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hemp-homes/journey");
      if (!res.ok) {
        setMessage("Failed to load entries");
        return;
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setMessage("Network error loading entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Journey Timeline</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          The public timeline on the Hemp Homes page reads from these rows
          (migrated from the previously hard-coded data file). Inline editing
          and drag-to-reorder ship in the next chunk; this view is read-only
          so you can verify the seed migrated cleanly.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded text-sm bg-red-50 text-red-700 border border-red-200">
          {message}
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-900">
          Entries ({entries.length})
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading entries…</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-slate-500">No journey entries yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-left">Title</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t hover:bg-slate-50 align-top">
                  <td className="px-3 py-2 text-xs text-slate-500 font-mono">{e.sort_order}</td>
                  <td className="px-3 py-2 text-xs font-mono">{e.date_label}</td>
                  <td className="px-3 py-2"><StageBadge stage={e.stage} /></td>
                  <td className="px-3 py-2"><StateBadge state={e.state} /></td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-1 max-w-2xl">{e.body}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
