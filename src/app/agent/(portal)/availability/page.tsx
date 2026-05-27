"use client";

import { useEffect, useState } from "react";
import { useAgent, canAccess } from "@/components/agent/AgentContext";

interface Lot {
  lot_number: number;
  sqm: number | null;
  category: string | null;
  zone: string | null;
  status: string | null;
  stage_number: number | null;
  stage_label: string | null;
  is_open_for_registration: boolean;
  total_price: number | null;
}

interface Unit {
  unit_id: string;
  unit_number: number;
  type: string;
  zone: string | null;
  description: string | null;
  status: string | null;
  retail_price: number | null;
  interest_count: number;
}

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-300",
  reserved: "bg-amber-100 text-amber-800 border-amber-300",
  sold: "bg-slate-200 text-slate-800 border-slate-400",
  withheld: "bg-rose-100 text-rose-800 border-rose-300",
  backup_list_only: "bg-sky-100 text-sky-800 border-sky-300",
};

function badge(status: string | null) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 rounded text-xs font-semibold ${
        STATUS_BADGE[status || ""] || "bg-slate-100 text-slate-700 border-slate-300"
      }`}
    >
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function SeafieldsTable({ lots }: { lots: Lot[] }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left">Lot</th>
            <th className="px-3 py-2 text-left">Size</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Stage</th>
            <th className="px-3 py-2 text-left">Open</th>
            <th className="px-3 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((l) => (
            <tr key={l.lot_number} className="border-t">
              <td className="px-3 py-2 font-semibold">{l.lot_number}</td>
              <td className="px-3 py-2">{l.sqm}m²</td>
              <td className="px-3 py-2">{badge(l.status)}</td>
              <td className="px-3 py-2">{l.stage_number ? `S${l.stage_number}` : "—"}</td>
              <td className="px-3 py-2">{l.is_open_for_registration ? "✓" : "—"}</td>
              <td className="px-3 py-2 text-right font-medium">{fmt(l.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BranscombeTable({ units }: { units: Unit[] }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left">Unit</th>
            <th className="px-3 py-2 text-left">Home</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-center">Interests</th>
            <th className="px-3 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.unit_id} className="border-t">
              <td className="px-3 py-2 font-semibold">{u.unit_number}</td>
              <td className="px-3 py-2">
                <div className="font-medium text-slate-800">Type {u.type}</div>
                {u.description && (
                  <div className="text-xs text-slate-500">{u.description}</div>
                )}
              </td>
              <td className="px-3 py-2">{badge(u.status)}</td>
              <td className="px-3 py-2 text-center">{u.interest_count || "—"}</td>
              <td className="px-3 py-2 text-right font-medium">{fmt(u.retail_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AvailabilityPage() {
  const { estateAccess } = useAgent();
  const showSeafields = canAccess(estateAccess, "seafields");
  const showBranscombe = canAccess(estateAccess, "branscombe");
  const both = showSeafields && showBranscombe;

  const [lots, setLots] = useState<Lot[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tasks: Promise<void>[] = [];
        if (showSeafields) {
          tasks.push(
            fetch("/api/agent/availability")
              .then((r) => (r.ok ? r.json() : { lots: [] }))
              .then((d) => setLots(d.lots || [])),
          );
        }
        if (showBranscombe) {
          tasks.push(
            fetch("/api/agent/availability/branscombe")
              .then((r) => (r.ok ? r.json() : { units: [] }))
              .then((d) => setUnits(d.units || [])),
          );
        }
        await Promise.all(tasks);
      } catch {
        setError("Couldn't load availability.");
      } finally {
        setLoading(false);
      }
    })();
  }, [showSeafields, showBranscombe]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Availability</h1>
      <p className="text-sm text-slate-500 mb-4 max-w-2xl">
        Live status for every lot/unit. You can see whether it is available,
        reserved or sold, its listed price and how many buyers have registered
        interest — buyer details for anything held by others stay private.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          {showSeafields && (
            <section className="mb-8">
              {both && (
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Seafields Estate
                </h2>
              )}
              <SeafieldsTable lots={lots} />
            </section>
          )}
          {showBranscombe && (
            <section className="mb-8">
              {both && (
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Branscombe Estate
                </h2>
              )}
              <BranscombeTable units={units} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
