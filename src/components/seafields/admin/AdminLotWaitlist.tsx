"use client";

import { useCallback, useEffect, useState } from "react";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
  interest_type: string | null;
  buyer_type: string | null;
  buyer_profile: string | null;
  purchase_timeline: string | null;
  finance_status: string | null;
  lots_selected: string[];
  price_preferences: Record<string, string> | null;
  dwelling_preferences: Record<
    string,
    { primary?: string | null; secondary?: string | null }
  > | null;
  referrer_type: string | null;
  referrer_name: string | null;
  referrer_company: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  lotId: string;
  lotNumber: number;
  intentLockedToRegistrationId: string | null;
  onIntentLockChanged: (
    registrationId: string | null,
    fullName?: string,
  ) => void;
  onConvertedToAllocation: (fullName: string) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminLotWaitlist({
  lotId,
  lotNumber,
  intentLockedToRegistrationId,
  onIntentLockChanged,
  onConvertedToAllocation,
}: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/seafields/lot-waitlist/${encodeURIComponent(lotId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load waitlist");
        return;
      }
      setRegistrations(data.registrations || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  async function patchAllocation(
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/seafields/allocations/${lotNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Update failed" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function lockTo(reg: Registration) {
    setActingOn(reg.id);
    setError(null);
    const fullName = `${reg.first_name} ${reg.last_name}`.trim();
    const result = await patchAllocation({
      intent_locked_to_registration_id: reg.id,
    });
    setActingOn(null);
    if (!result.ok) {
      setError(result.error || "Lock failed");
      return;
    }
    onIntentLockChanged(reg.id, fullName);
  }

  async function unlock() {
    setActingOn("unlock");
    setError(null);
    const result = await patchAllocation({
      intent_locked_to_registration_id: null,
    });
    setActingOn(null);
    if (!result.ok) {
      setError(result.error || "Unlock failed");
      return;
    }
    onIntentLockChanged(null);
  }

  async function convertToAllocation(reg: Registration) {
    const fullName = `${reg.first_name} ${reg.last_name}`.trim();
    if (
      !confirm(
        `Convert "${fullName}" to a firm allocation on Lot ${lotNumber}? ` +
          `This sets the public Reserved badge and clears any soft-allocate.`,
      )
    ) {
      return;
    }
    setActingOn(reg.id);
    setError(null);
    const result = await patchAllocation({
      allocated_to: fullName,
    });
    setActingOn(null);
    if (!result.ok) {
      setError(result.error || "Convert failed");
      return;
    }
    onConvertedToAllocation(fullName);
  }

  const lockedReg = registrations.find(
    (r) => r.id === intentLockedToRegistrationId,
  );

  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Waitlist for this lot
        </h4>
        <span className="text-xs text-slate-500">
          {loading ? "…" : `${registrations.length} registered`}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700 mb-3">
          {error}
        </div>
      )}

      {/* Currently locked registrant */}
      {lockedReg && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Soft-allocated to
              </div>
              <div className="font-semibold text-slate-900 text-sm mt-0.5">
                {lockedReg.first_name} {lockedReg.last_name}
              </div>
              <div className="text-xs text-slate-600">{lockedReg.email}</div>
            </div>
            <button
              onClick={unlock}
              disabled={actingOn === "unlock"}
              className="text-xs text-amber-900 hover:text-amber-700 underline disabled:opacity-50 whitespace-nowrap"
            >
              {actingOn === "unlock" ? "Unlocking…" : "Unlock"}
            </button>
          </div>
          <button
            onClick={() => convertToAllocation(lockedReg)}
            disabled={actingOn === lockedReg.id}
            className="w-full mt-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold py-1.5 rounded disabled:opacity-50"
          >
            {actingOn === lockedReg.id
              ? "Converting…"
              : "Convert to firm allocation →"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-slate-400">Loading…</div>
      ) : registrations.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-2">
          No one has registered interest in this lot yet.
        </div>
      ) : (
        <div className="space-y-2">
          {registrations.map((r) => {
            const isLocked = r.id === intentLockedToRegistrationId;
            const isActing = actingOn === r.id;
            const fullName = `${r.first_name} ${r.last_name}`.trim();
            const otherLots = r.lots_selected.filter((l) => l !== lotId).length;
            return (
              <div
                key={r.id}
                className={`border rounded p-3 ${
                  isLocked
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {fullName}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      <a
                        href={`mailto:${r.email}`}
                        className="hover:underline"
                      >
                        {r.email}
                      </a>
                      {r.phone && (
                        <>
                          {" · "}
                          <a
                            href={`tel:${r.phone}`}
                            className="hover:underline"
                          >
                            {r.phone}
                          </a>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Registered {formatDate(r.created_at)}
                      {otherLots > 0 && ` · also interested in ${otherLots} other lot${otherLots > 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>

                {/* Buyer signal block */}
                {(r.interest_type ||
                  r.buyer_type ||
                  r.purchase_timeline ||
                  r.finance_status ||
                  (r.price_preferences && r.price_preferences[lotId]) ||
                  (r.dwelling_preferences &&
                    r.dwelling_preferences[lotId] &&
                    (r.dwelling_preferences[lotId].primary ||
                      r.dwelling_preferences[lotId].secondary))) && (
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-700">
                    {r.interest_type && (
                      <div>
                        <span className="text-slate-500">Type:</span>{" "}
                        {r.interest_type}
                      </div>
                    )}
                    {r.buyer_type && (
                      <div>
                        <span className="text-slate-500">Buyer:</span>{" "}
                        {r.buyer_type}
                      </div>
                    )}
                    {r.purchase_timeline && (
                      <div>
                        <span className="text-slate-500">Timeline:</span>{" "}
                        {r.purchase_timeline}
                      </div>
                    )}
                    {r.finance_status && (
                      <div>
                        <span className="text-slate-500">Finance:</span>{" "}
                        {r.finance_status}
                      </div>
                    )}
                    {r.price_preferences && r.price_preferences[lotId] && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Price expectation:</span>{" "}
                        <span className="font-semibold text-emerald-700">
                          {r.price_preferences[lotId]}
                        </span>
                      </div>
                    )}
                    {r.dwelling_preferences &&
                      r.dwelling_preferences[lotId] &&
                      (r.dwelling_preferences[lotId].primary ||
                        r.dwelling_preferences[lotId].secondary) && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Dwelling plan:</span>{" "}
                          <span className="font-semibold text-slate-800">
                            {r.dwelling_preferences[lotId].primary || "—"}
                            {r.dwelling_preferences[lotId].secondary &&
                              ` + ${r.dwelling_preferences[lotId].secondary}`}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {r.notes && (
                  <div className="mt-2 text-[11px] text-slate-600 italic">
                    &ldquo;{r.notes}&rdquo;
                  </div>
                )}

                {!isLocked && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => lockTo(r)}
                      disabled={isActing}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium px-2.5 py-1 rounded disabled:opacity-50"
                    >
                      {isActing ? "Locking…" : "Lock as priority lead"}
                    </button>
                    <button
                      onClick={() => convertToAllocation(r)}
                      disabled={isActing}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 font-medium px-2.5 py-1 rounded disabled:opacity-50"
                    >
                      {isActing ? "Converting…" : "Allocate firmly"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
