// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  HOUSE_TYPE_INFO,
  HOUSE_TYPES,
  type HouseType,
} from "@/data/branscombe";
import AdminUnitMap, {
  type UnitAllocationLite,
} from "@/components/branscombe/admin/AdminUnitMap";
import AdminUnitEditModal, {
  type FullAllocation,
} from "@/components/branscombe/admin/AdminUnitEditModal";

interface Allocation {
  unit_number: number;
  home_type: string;
  area_m2: number;
  allocated_to: string | null;
  dwelling_type: string | null;
  notes: string | null;
  wholesale_price: number | null;
  retail_price: number | null;
  intent_locked_to_registration_id: string | null;
  intent_locked_at: string | null;
  intent_locked_by: string | null;
  assigned_at: string | null;
  updated_at: string;
}

export default function BranscombeUnitsPage() {
  const [rows, setRows] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    unitNumber: number;
    unitId: string;
  } | null>(null);
  const [interestCounts, setInterestCounts] = useState<Record<string, number>>(
    {},
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [filterAllocated, setFilterAllocated] = useState<
    "all" | "allocated" | "available"
  >("all");
  const [filterType, setFilterType] = useState<"all" | HouseType>("all");
  const [search, setSearch] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const [allocRes, countsRes] = await Promise.all([
        fetch("/api/admin/branscombe/allocations"),
        // Investor-portal exposes the public counts endpoint at the same path
        fetch("/api/admin/branscombe/units"),
      ]);
      if (allocRes.ok) {
        const data = await allocRes.json();
        setRows(data.allocations || []);
      } else {
        setMessage({ type: "error", text: "Failed to load allocations" });
      }
      if (countsRes.ok) {
        const data = await countsRes.json();
        setInterestCounts(data.counts || {});
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const allocByNumber = useMemo(() => {
    const map: Record<number, UnitAllocationLite> = {};
    for (const r of rows) {
      map[r.unit_number] = {
        unit_number: r.unit_number,
        allocated_to: r.allocated_to,
        intent_locked_to_registration_id: r.intent_locked_to_registration_id,
      };
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterAllocated === "allocated" && !r.allocated_to) return false;
      if (filterAllocated === "available" && r.allocated_to) return false;
      if (filterType !== "all" && r.home_type !== filterType) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `U${r.unit_number} ${r.allocated_to || ""} ${
          r.dwelling_type || ""
        } ${r.home_type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterAllocated, filterType, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const allocated = rows.filter((r) => r.allocated_to).length;
    const intentLocked = rows.filter(
      (r) => !r.allocated_to && r.intent_locked_to_registration_id,
    ).length;
    const totalRegistrations = Object.values(interestCounts).reduce(
      (s, n) => s + n,
      0,
    );
    return { total, allocated, intentLocked, totalRegistrations };
  }, [rows, interestCounts]);

  const editingAllocation: FullAllocation | null = editing
    ? rows.find((r) => r.unit_number === editing.unitNumber) || null
    : null;

  function handleSelectUnit(unitId: string, unitNumber: number) {
    setEditing({ unitId, unitNumber });
  }

  function handleSaved(updated: FullAllocation) {
    setRows((prev) =>
      prev.map((r) =>
        r.unit_number === updated.unit_number ? { ...r, ...updated } : r,
      ),
    );
    setMessage({
      type: "success",
      text: `${`U${updated.unit_number}`} updated`,
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        Branscombe Unit Allocations
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Authoritative register for the 37-home Branscombe Estate (Unison
        20E92-03 RevC, permit PLN-21-408.02). Click any home — on the map or in
        the table — to edit allocation, pricing, and notes, or to manage the
        waitlist.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Total homes
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Allocated
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {stats.allocated}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Soft-allocated
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.intentLocked}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Total interest registrations
          </div>
          <div className="text-2xl font-bold text-sky-700">
            {stats.totalRegistrations}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          type="text"
          placeholder="Search U#, buyer, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-64"
        />
        <div className="flex gap-1 bg-slate-100 rounded p-1 text-sm">
          {(
            [
              { v: "all", label: "All" },
              { v: "allocated", label: "Allocated" },
              { v: "available", label: "Available" },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilterAllocated(f.v)}
              className={`px-3 py-1 rounded ${
                filterAllocated === f.v
                  ? "bg-white shadow-sm font-semibold text-slate-900"
                  : "text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded p-1 text-sm">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2 py-1 rounded ${
              filterType === "all"
                ? "bg-white shadow-sm font-semibold text-slate-900"
                : "text-slate-600"
            }`}
          >
            All types
          </button>
          {HOUSE_TYPES.map((t) => {
            const info = HOUSE_TYPE_INFO[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded border ${
                  filterType === t
                    ? "font-semibold"
                    : "border-transparent text-slate-600"
                }`}
                style={
                  filterType === t
                    ? {
                        backgroundColor: `${info.color}33`,
                        borderColor: info.border,
                        color: info.border,
                      }
                    : undefined
                }
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="text-sm text-slate-500 ml-auto">
          Showing {filtered.length} of {rows.length}
        </div>
      </div>

      {/* Map + Table side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:sticky lg:top-4 self-start">
          <AdminUnitMap
            allocations={allocByNumber}
            interestCounts={interestCounts}
            selectedUnitId={editing?.unitId ?? null}
            onSelectUnit={handleSelectUnit}
          />
        </div>

        <div className="bg-white border rounded overflow-hidden">
          {loading ? (
            <div className="p-6 text-slate-500">Loading homes…</div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: "78vh" }}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">m²</th>
                    <th className="px-3 py-2 text-left">Allocated</th>
                    <th className="px-3 py-2 text-right">Interest</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const unitId = `U${row.unit_number}`;
                    const interest = interestCounts[unitId] || 0;
                    const isSelected =
                      editing?.unitNumber === row.unit_number;
                    const hasIntent = !!row.intent_locked_to_registration_id;
                    const info =
                      HOUSE_TYPE_INFO[row.home_type as HouseType] || null;
                    return (
                      <tr
                        key={row.unit_number}
                        className={`border-t hover:bg-slate-50 cursor-pointer ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() =>
                          setEditing({
                            unitId,
                            unitNumber: row.unit_number,
                          })
                        }
                      >
                        <td className="px-3 py-2 font-semibold">{unitId}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-block border px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={
                              info
                                ? {
                                    backgroundColor: `${info.color}22`,
                                    borderColor: info.border,
                                    color: info.border,
                                  }
                                : undefined
                            }
                          >
                            {row.home_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.area_m2}
                        </td>
                        <td className="px-3 py-2">
                          {row.allocated_to ? (
                            <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                              {row.allocated_to}
                            </span>
                          ) : hasIntent ? (
                            <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">
                              Soft
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {interest > 0 ? (
                            <span className="inline-block bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-xs font-medium">
                              {interest}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing({
                                unitId,
                                unitNumber: row.unit_number,
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <AdminUnitEditModal
          unitNumber={editing.unitNumber}
          unitId={editing.unitId}
          allocation={editingAllocation}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
