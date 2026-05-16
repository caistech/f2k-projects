"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ENTITY_OPTIONS = [
  { v: "", label: "All entity types" },
  { v: "stages", label: "stages" },
  { v: "seafields_lot_allocations", label: "seafields_lot_allocations" },
  { v: "dwelling_types", label: "dwelling_types" },
  { v: "seafields_registration_lots", label: "seafields_registration_lots" },
  { v: "seafields_lot_allocation", label: "seafields_lot_allocation (legacy)" },
  { v: "branscombe_unit_allocation", label: "branscombe_unit_allocation" },
];

const ACTION_PREFIX_OPTIONS = [
  { v: "", label: "All actions" },
  { v: "UPDATE_", label: "UPDATE_*" },
  { v: "INSERT_", label: "INSERT_*" },
  { v: "DELETE_", label: "DELETE_*" },
  { v: "seafields_", label: "seafields_*" },
  { v: "ghl_", label: "ghl_*" },
];

const PAGE_SIZE = 50;

function localISO(d: Date): string {
  // ISO with seconds, suitable for datetime-local <input>
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function entityDisplay(e: AuditEntry): string {
  if (e.entity_type === "seafields_lot_allocations") {
    const ln = e.details?.lot_number;
    return ln != null ? `Lot ${ln}` : "Lot ?";
  }
  if (e.entity_id) return e.entity_id.slice(0, 8) + "…";
  return "—";
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filters — default range is last 24h
  const initialSince = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return localISO(d);
  }, []);
  const initialUntil = useMemo(() => localISO(new Date()), []);

  const [filterEntity, setFilterEntity] = useState("");
  const [filterActor, setFilterActor] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterField, setFilterField] = useState("");
  const [since, setSince] = useState(initialSince);
  const [until, setUntil] = useState(initialUntil);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterEntity) params.set("entity_type", filterEntity);
      if (filterActor.trim()) params.set("actor_email", filterActor.trim());
      if (filterAction) params.set("action_prefix", filterAction);
      if (filterField.trim()) params.set("field_changed", filterField.trim());
      if (since) params.set("since", new Date(since).toISOString());
      if (until) params.set("until", new Date(until).toISOString());
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load audit log");
        return;
      }
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [filterEntity, filterActor, filterAction, filterField, since, until, offset]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function applyFilters() {
    setOffset(0);
    fetchEntries();
  }

  function resetFilters() {
    setFilterEntity("");
    setFilterActor("");
    setFilterAction("");
    setFilterField("");
    setSince(initialSince);
    setUntil(initialUntil);
    setOffset(0);
  }

  const pageNum = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Audit Log</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-3xl">
        Every admin write writes one audit row per changed field via the
        database trigger (migration 0005 + 0008). Filter by entity, actor,
        action prefix, field, or date range. Default view is the last 24 hours.
      </p>

      <div className="bg-white border rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Entity type
          </label>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Action prefix
          </label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {ACTION_PREFIX_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Actor email
          </label>
          <input
            type="text"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            placeholder="dennis@factory2key.com.au"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Field changed
          </label>
          <input
            type="text"
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            placeholder="e.g. status, rate_per_sqm"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Since
          </label>
          <input
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Until
          </label>
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-2">
          <button
            type="button"
            onClick={applyFilters}
            className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-semibold"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
        <div>
          {loading ? "Loading…" : `${total.toLocaleString()} total · showing ${entries.length} on page ${pageNum} of ${pageCount}`}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="border border-slate-300 px-2 py-1 rounded disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="border border-slate-300 px-2 py-1 rounded disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">When</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="px-3 py-2 text-left">Old → New</th>
                <th className="px-3 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-400 italic"
                  >
                    No audit entries match the current filter.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-slate-50 align-top">
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                      {fmtTimestamp(e.created_at)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          e.actor_email === "system"
                            ? "bg-slate-100 text-slate-600"
                            : e.actor_email?.includes("migration") ||
                                e.actor_email?.includes("apply-seafields")
                              ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {e.actor_email ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono whitespace-nowrap">
                      {e.action}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <div>{entityDisplay(e)}</div>
                      <div className="text-[10px] text-slate-400">
                        {e.entity_type}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 font-mono">
                      {e.field_changed ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {e.field_changed ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-500">
                            <span className="text-[10px] uppercase">old:</span>{" "}
                            <span className="font-mono">{fmtValue(e.old_value)}</span>
                          </div>
                          <div className="text-slate-900">
                            <span className="text-[10px] uppercase">new:</span>{" "}
                            <span className="font-mono">{fmtValue(e.new_value)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          {e.action.startsWith("INSERT_")
                            ? "(insert — see details)"
                            : e.action.startsWith("DELETE_")
                              ? "(delete — see details)"
                              : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-xs">
                      {e.reason ? (
                        <span className="italic">{e.reason}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Actor badge colors: green = real admin user, amber = migration /
        apply-script, gray = unattributed (pre-0008 writes or background jobs).
        Each UPDATE writes one row per changed field; INSERT/DELETE write one
        row with the full snapshot in <code>details</code>.
      </p>
    </div>
  );
}
