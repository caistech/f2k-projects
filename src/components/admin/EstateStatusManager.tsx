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
  status_notified_at: string | null;
  status_notified_count: number | null;
}

// Deactivating hides a public page, so a reason is required (mirrors the admin material-change gate).
const MIN_REASON_LEN = 10;

// Who a toggle would reach — fetched before the operator commits, because deactivating fans out
// real emails to external agents and asks them to contact their buyers. That consequence belongs in
// front of the button, not in the response (PRODUCT_STANDARDS §9).
interface StatusImpact {
  agents: Array<{ name: string; email: string; agency: string | null; clientCount: number }>;
  adminCount: number;
  unassignedClientCount: number;
  totalClients: number;
  sourceErrors: string[];
}

// What actually happened once the toggle ran.
interface NotifyResult {
  sent: number;
  failed: number;
  agentsNotified: number;
  clientsCovered: number;
  unassignedClients: number;
  errors: string[];
}

// The estate the admin is about to toggle, held while the confirm dialog is open.
interface PendingToggle {
  estate: EstateStatus;
  nextArchived: boolean;
}

// The estate whose CURRENT status is about to be announced without changing it (the
// already-archived-but-never-told case). Held while its own confirm dialog is open.
interface PendingAnnounce {
  estate: EstateStatus;
}

export default function EstateStatusManager() {
  const [estates, setEstates] = useState<EstateStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [impact, setImpact] = useState<StatusImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [notify, setNotify] = useState(true);
  const [outcome, setOutcome] = useState<{
    estateName: string;
    archived: boolean;
    result: NotifyResult | null;
    /** True when the status wasn't changed, only re-announced. */
    announceOnly?: boolean;
  } | null>(null);
  const [announcing, setAnnouncing] = useState<PendingAnnounce | null>(null);

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

  async function openConfirm(estate: EstateStatus, nextArchived: boolean) {
    setReason("");
    setNotify(true);
    setImpact(null);
    setOutcome(null);
    setPending({ estate, nextArchived });

    // Load who this reaches while the operator is typing the reason.
    setImpactLoading(true);
    try {
      const res = await fetch(
        `/api/admin/estates/status/impact?slug=${encodeURIComponent(estate.slug)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (res.ok) setImpact(json as StatusImpact);
    } catch {
      // A failed preview must not block the toggle — the dialog just falls back to generic copy.
    } finally {
      setImpactLoading(false);
    }
  }

  async function openAnnounce(estate: EstateStatus) {
    setImpact(null);
    setOutcome(null);
    setAnnouncing({ estate });
    setImpactLoading(true);
    try {
      const res = await fetch(
        `/api/admin/estates/status/impact?slug=${encodeURIComponent(estate.slug)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (res.ok) setImpact(json as StatusImpact);
    } catch {
      // Preview failure must not block the announcement.
    } finally {
      setImpactLoading(false);
    }
  }

  async function confirmAnnounce() {
    if (!announcing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/estates/status/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: announcing.estate.slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send the announcement");
      setOutcome({
        estateName: announcing.estate.name,
        archived: Boolean(json.archived),
        result: (json.notification as NotifyResult | null) ?? null,
        announceOnly: true,
      });
      setAnnouncing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send the announcement");
    } finally {
      setSaving(false);
    }
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
          notify,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update estate");
      setOutcome({
        estateName: pending.estate.name,
        archived: pending.nextArchived,
        result: (json.notification as NotifyResult | null) ?? null,
      });
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
          deleted; reactivate any time to bring it straight back. Deactivating also{" "}
          <strong>stops every automated email for that estate</strong> and notifies its agents and
          admins — registered buyers are never emailed by the system, their agent is asked to
          contact them.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {outcome && <OutcomeBanner outcome={outcome} onDismiss={() => setOutcome(null)} />}

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
                {/* A status change nobody was told about is the failure this feature exists to
                    prevent — so it reads as a warning on the row, not a missing field. */}
                {e.status_notified_at ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Announced to {e.status_notified_count ?? 0} stakeholder
                    {e.status_notified_count === 1 ? "" : "s"} on{" "}
                    {new Date(e.status_notified_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    This status hasn&apos;t been announced to agents or admins
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                {/* Announce the CURRENT status without changing it — the only way to notify
                    stakeholders about an estate archived before this existed, short of
                    reactivating it and putting a withdrawn development back on the public site. */}
                <button
                  type="button"
                  onClick={() => openAnnounce(e)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {e.status_notified_at ? "Re-send notice" : "Announce status"}
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm(e, !e.archived)}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                    e.archived
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {e.archived ? "Activate" : "Deactivate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {announcing && (
        <AnnounceDialog
          estate={announcing.estate}
          impact={impact}
          impactLoading={impactLoading}
          saving={saving}
          onCancel={() => setAnnouncing(null)}
          onConfirm={confirmAnnounce}
        />
      )}

      {/* Confirm dialog — states the consequence before the change (PRODUCT_STANDARDS §9) */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {pending.nextArchived ? "Deactivate" : "Activate"} {pending.estate.name}?
            </h2>

            {pending.nextArchived ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This hides <strong>{pending.estate.name}</strong> from the whole public site — the
                nav, the map, the landing cards and its state page. Anyone opening{" "}
                <span className="whitespace-nowrap font-mono text-xs">{pending.estate.href}</span>{" "}
                directly will see a &ldquo;page archived&rdquo; notice instead of the estate. It also
                stops every automated email for this estate — buyer follow-ups, the daily digest and
                estate updates — and closes new registrations. No data is deleted.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This brings <strong>{pending.estate.name}</strong> back onto the public site — it
                reappears in the nav, map, landing cards and its state page, and its page goes live
                again. Automated emails and new registrations resume.
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
                  your email and timestamp. The reason is quoted verbatim in the notification email.
                </p>
              </div>
            )}

            <ImpactBlock
              impact={impact}
              loading={impactLoading}
              archived={pending.nextArchived}
              estateName={pending.estate.name}
            />

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={notify}
                onChange={(ev) => setNotify(ev.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Email agents and admins about this change
                <span className="mt-0.5 block text-xs text-slate-500">
                  Leave this on unless you have already told everyone yourself. Turning it off is
                  recorded in the audit log.
                </span>
              </span>
            </label>

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

/**
 * Who this toggle reaches, shown before the operator commits.
 *
 * The number that matters most is the registrant count sitting behind each agent: deactivating
 * doesn't just hide a page, it hands real people an obligation to ring their buyers. Seeing "3
 * agents, 41 buyers between them" before clicking is the difference between an informed decision
 * and a surprise.
 */
function ImpactBlock({
  impact,
  loading,
  archived,
  estateName,
}: {
  impact: StatusImpact | null;
  loading: boolean;
  archived: boolean;
  estateName: string;
}) {
  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">Checking who this affects…</p>;
  }
  if (!impact) return null;

  const agentsWithClients = impact.agents.filter((a) => a.clientCount > 0);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Who this reaches
      </p>

      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        <li>
          <strong>{impact.agents.length}</strong> agent
          {impact.agents.length === 1 ? "" : "s"} and <strong>{impact.adminCount}</strong> admin
          {impact.adminCount === 1 ? "" : "s"} will be emailed.
        </li>
        <li>
          <strong>{impact.totalClients}</strong> registered buyer
          {impact.totalClients === 1 ? "" : "s"} on {estateName} —{" "}
          <strong>none of them will be emailed by the system.</strong>
        </li>
      </ul>

      {archived && agentsWithClients.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-slate-600">
            Each agent gets their own client list and is asked to contact them directly:
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
            {agentsWithClients.slice(0, 6).map((a) => (
              <li key={a.email}>
                {a.name}
                {a.agency ? <span className="text-slate-400"> ({a.agency})</span> : null} —{" "}
                {a.clientCount} buyer{a.clientCount === 1 ? "" : "s"}
              </li>
            ))}
            {agentsWithClients.length > 6 && (
              <li className="text-slate-500">…and {agentsWithClients.length - 6} more</li>
            )}
          </ul>
        </div>
      )}

      {archived && impact.unassignedClientCount > 0 && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          <strong>{impact.unassignedClientCount}</strong> registered buyer
          {impact.unassignedClientCount === 1 ? " has" : "s have"} no introducing agent — nobody will
          be asked to contact them. They&apos;re listed in the admin email so F2K can own it.
        </p>
      )}

      {impact.sourceErrors.length > 0 && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
          These counts may be incomplete: {impact.sourceErrors.join("; ")}
        </p>
      )}
    </div>
  );
}

/** What actually happened — shown after the toggle so a partial send is never mistaken for a clean one. */
function OutcomeBanner({
  outcome,
  onDismiss,
}: {
  outcome: {
    estateName: string;
    archived: boolean;
    result: NotifyResult | null;
    announceOnly?: boolean;
  };
  onDismiss: () => void;
}) {
  const { estateName, archived, result, announceOnly } = outcome;
  const failed = result ? result.failed > 0 || result.errors.length > 0 : false;
  const headline = announceOnly
    ? `${estateName} status announced (${archived ? "off market" : "live"}).`
    : `${estateName} ${archived ? "deactivated" : "reactivated"}.`;

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        failed
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{headline}</p>
          {result ? (
            <p className="mt-1">
              Emailed {result.sent} stakeholder{result.sent === 1 ? "" : "s"} (
              {result.agentsNotified} agent{result.agentsNotified === 1 ? "" : "s"} covering{" "}
              {result.clientsCovered} registered buyer
              {result.clientsCovered === 1 ? "" : "s"}).
              {result.unassignedClients > 0 && (
                <>
                  {" "}
                  {result.unassignedClients} buyer
                  {result.unassignedClients === 1 ? "" : "s"} have no agent — F2K owns contacting
                  them.
                </>
              )}
            </p>
          ) : (
            <p className="mt-1">
              No notifications were sent (you turned them off). Nobody has been told about this
              change.
            </p>
          )}
          {result && result.errors.length > 0 && (
            <p className="mt-1 text-xs">Problems: {result.errors.join("; ")}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/** Confirm dialog for announcing the current status without changing it. */
function AnnounceDialog({
  estate,
  impact,
  impactLoading,
  saving,
  onCancel,
  onConfirm,
}: {
  estate: EstateStatus;
  impact: StatusImpact | null;
  impactLoading: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-bold text-slate-900">
          Announce {estate.name}&apos;s current status?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This sends real emails now. It tells agents and admins that{" "}
          <strong>{estate.name}</strong> is currently{" "}
          <strong>{estate.archived ? "off market" : "live"}</strong>
          {estate.archived && estate.archived_reason ? (
            <> — quoting the recorded reason, &ldquo;{estate.archived_reason}&rdquo;</>
          ) : null}
          . The estate&apos;s status is <strong>not</strong> changed, and no registered buyer is
          emailed.
          {estate.status_notified_at ? (
            <>
              {" "}
              This status was already announced once — send again only if the first attempt failed
              or an agent has been added since.
            </>
          ) : null}
        </p>

        <ImpactBlock
          impact={impact}
          loading={impactLoading}
          archived={estate.archived}
          estateName={estate.name}
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#00857e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006b66] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Sending…" : "Send notifications"}
          </button>
        </div>
      </div>
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
