"use client";

import { useEffect, useState } from "react";

interface EstateStatus {
  slug: string;
  name: string;
  href: string;
  stateName: string;
  parked: boolean;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  archived_reason: string | null;
}

// Deactivating hides a public page, so a reason is required (mirrors the admin material-change gate).
const MIN_REASON_LEN = 10;

// The estate the admin is about to toggle, held while the confirm dialog is open.
interface PendingToggle {
  estate: EstateStatus;
  nextArchived: boolean;
}

export default function EstateStatusManager() {
  const [estates, setEstates] = useState<EstateStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/admin/estates/status", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load estates");
      setEstates(json.estates as EstateStatus[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load estates");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openConfirm(estate: EstateStatus, nextArchived: boolean) {
    setReason("");
    setPending({ estate, nextArchived });
  }

  async function confirmToggle() {
    if (!pending) return;
    if (pending.nextArchived && reason.trim().length < MIN_REASON_LEN) {
      setError(`A reason (at least ${MIN_REASON_LEN} characters) is required to deactivate an estate.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/estates/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: pending.estate.slug,
          archived: pending.nextArchived,
          reason: reason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update estate");
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update estate");
    } finally {
      setSaving(false);
    }
  }

  return (
    // pb-28 keeps the last row / buttons clear of the fixed SayFix "Report a problem" button
    // (bottom-left, always-on-top) so they never overlap on a short mobile viewport.
    <div className="mx-auto max-w-4xl p-4 pb-28 sm:p-6 sm:pb-28">
      {/* Explanatory header (PRODUCT_STANDARDS §5) */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Estate Pages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Turn an estate&apos;s public page on or off. Deactivating an estate <strong>archives</strong>{" "}
          it — it disappears from the nav, the Australia map, the landing cards and its state page,
          and anyone who opens its direct link sees a &ldquo;page archived&rdquo; notice. Nothing is
          deleted; reactivate any time to bring it straight back.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {estates === null && !error && (
        <p className="text-sm text-slate-500">Loading estates…</p>
      )}

      {estates && (
        <ul className="space-y-3">
          {estates.map((e) => (
            <li
              key={e.slug}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{e.name}</span>
                  <StatusPill archived={e.archived} parked={e.parked} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {e.stateName} ·{" "}
                  <a
                    href={e.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00857e] underline hover:text-[#006b66]"
                  >
                    {e.href}
                  </a>
                </p>
                {e.parked && !e.archived && (
                  <p className="mt-1 text-xs italic text-slate-500">
                    Unlisted in code — won&apos;t appear on public surfaces even while active. Making
                    it public requires a code change + deploy.
                  </p>
                )}
                {e.archived && e.archived_reason && (
                  <p className="mt-1 text-xs italic text-slate-500">
                    Reason: {e.archived_reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => openConfirm(e, !e.archived)}
                className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  e.archived
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-700 hover:bg-slate-800"
                }`}
              >
                {e.archived ? "Activate" : "Deactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Confirm dialog — states the consequence before the change (PRODUCT_STANDARDS §9) */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {pending.nextArchived ? "Deactivate" : "Activate"} {pending.estate.name}?
            </h2>

            {pending.nextArchived ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This hides <strong>{pending.estate.name}</strong> from the whole public site — the
                nav, the map, the landing cards and its state page. Anyone opening{" "}
                <span className="whitespace-nowrap font-mono text-xs">{pending.estate.href}</span>{" "}
                directly will see a &ldquo;page archived&rdquo; notice instead of the estate. No data
                is deleted.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This brings <strong>{pending.estate.name}</strong> back onto the public site — it
                reappears in the nav, map, landing cards and its state page, and its page goes live
                again.
              </p>
            )}

            {pending.nextArchived && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label
                  htmlFor="archive-reason"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-900"
                >
                  Reason for change (required, ≥{MIN_REASON_LEN} chars)
                </label>
                <textarea
                  id="archive-reason"
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. Stage sold out; pausing marketing for this development"
                />
                <p className="mt-1 text-[11px] text-amber-800">
                  Required because this takes a public page offline. The audit log records it with
                  your email and timestamp.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggle}
                disabled={
                  saving ||
                  (pending.nextArchived && reason.trim().length < MIN_REASON_LEN)
                }
                className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  pending.nextArchived
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving
                  ? "Saving…"
                  : pending.nextArchived
                    ? "Deactivate estate"
                    : "Activate estate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Precedence: an archived estate reads "Archived"; a code-parked (unlisted) one reads
// "Parked (unlisted)" rather than a misleading "Live"; otherwise "Live".
function StatusPill({ archived, parked }: { archived: boolean; parked: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Archived
      </span>
    );
  }
  if (parked) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
        Parked (unlisted)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Live
    </span>
  );
}
