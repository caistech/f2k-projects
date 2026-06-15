"use client";

import { useCallback, useEffect, useState } from "react";

// Operator console for the Seafields local-employer accommodation campaign.
// Drives /api/admin/seafields/employer-campaign (admin-session auth). Sending is a
// human-fired, consequence-clear action: the operator sends a TEST to themselves
// first, reviews it, then fires the live send to the emailable prospect list.

interface Counts {
  total: number;
  byStatus: Record<string, number>;
  sendableNow: number;
}

const SECTORS = [
  "All sectors",
  "Aboriginal Owned",
  "Civil Works",
  "Transport & Logistics",
  "Building Companies",
  "Painters & Landscape",
  "Electrical & Plumbing",
] as const;

export default function EmployerCampaignPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"test" | "live" | null>(null);
  const [sector, setSector] = useState<string>("All sectors");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seafields/employer-campaign");
      if (res.ok) setCounts(await res.json());
      else setMsg({ type: "err", text: "Failed to load prospect counts." });
    } catch {
      setMsg({ type: "err", text: "Failed to load prospect counts." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendTest() {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/seafields/employer-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed");
      const ok = (data.results || []).filter((r: { status: string }) => r.status === "sent");
      setMsg({
        type: "ok",
        text: `Test sent to ${ok.map((r: { email: string }) => r.email).join(", ")}. Check your inbox, then send live below.`,
      });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Test send failed" });
    } finally {
      setBusy(null);
    }
  }

  async function sendLive() {
    const n = counts?.sendableNow ?? 0;
    const scope = sector === "All sectors" ? "all sectors" : sector;
    const confirmText =
      `Send the live email to ${n} emailable prospect${n === 1 ? "" : "s"} (${scope}) right now?\n\n` +
      `These are real businesses. The emails cannot be un-sent. Only prospects with status "imported" are sent (already-emailed/unsubscribed are skipped).`;
    if (!window.confirm(confirmText)) return;

    setBusy("live");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/seafields/employer-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "live",
          sector: sector === "All sectors" ? undefined : sector,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Live send failed");
      setMsg({
        type: "ok",
        text: `Sent ${data.sent} / ${data.attempted}. Failed: ${data.failed}.` +
          (data.failed ? ` First failures: ${(data.failures || []).map((f: { email: string }) => f.email).join(", ")}` : ""),
      });
      load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Live send failed" });
    } finally {
      setBusy(null);
    }
  }

  const status = counts?.byStatus ?? {};

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900">Seafields — Employer Accommodation Campaign</h2>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
        Outbound email to the imported Midwest Geraldton businesses, inviting them to the
        local-employer staff-accommodation page. Send a <strong>test to yourself</strong> first,
        review it, then fire the <strong>live send</strong>. Each business is emailed once
        (status moves <code>imported → emailed</code>); unsubscribes and already-sent rows are
        skipped automatically.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading prospect counts…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total prospects" value={counts?.total ?? 0} />
            <Stat label="Sendable now" value={counts?.sendableNow ?? 0} highlight />
            <Stat label="Emailed" value={status.emailed ?? 0} />
            <Stat label="Unsubscribed" value={status.unsubscribed ?? 0} />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Statuses: {Object.entries(status).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
          </div>

          {msg && (
            <div
              className={`mt-5 rounded border px-4 py-3 text-sm ${
                msg.type === "ok"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">1 · Send a test to yourself</h3>
            <p className="mt-1 text-sm text-slate-600">
              Sends the exact email (subject, copy, unsubscribe link) to
              dennis@ and uwe@factory2key.com.au. No prospect is touched.
            </p>
            <button
              onClick={sendTest}
              disabled={busy !== null}
              className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {busy === "test" ? "Sending test…" : "Send test to me + Uwe"}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-5">
            <h3 className="font-semibold text-slate-900">2 · Send the live campaign</h3>
            <p className="mt-1 text-sm text-slate-700">
              Emails real businesses — <strong>cannot be un-sent</strong>. Optionally limit to one
              sector to pilot first.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={busy !== null}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={sendLive}
                disabled={busy !== null || (counts?.sendableNow ?? 0) === 0}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy === "live"
                  ? "Sending…"
                  : `Send live to ${counts?.sendableNow ?? 0} emailable →`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
