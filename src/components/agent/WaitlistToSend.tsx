"use client";

import { useCallback, useEffect, useState } from "react";
import {
  stageLabel,
  FINANCE_STATUSES,
  FINANCE_LABELS,
  VIEWED_MODES,
  VIEWED_LABELS,
  EXIT_REASONS,
  EXIT_REASON_LABELS,
} from "@/lib/roi/pipeline";

interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  buyer_category: string | null;
  status: string;
  qualification_sent_at: string | null;
  submitted_at: string;
  estate_slug: string;
  estate_name: string;
  pipeline_stage: string;
  pipeline_state: string;
  finance_status: string;
  viewed_at: string | null;
  viewed_mode: string | null;
  exit_reason: string | null;
  exit_stage: string | null;
}

/**
 * Agent portal — "My buyers" pipeline panel. Lists the agent's own attributed buyers with their
 * current stage + finance + viewing milestone, and the actions an agent owns: mark contacted, send
 * the qualification (second) form, record a viewing, set finance status, and withdraw-with-reason.
 * Every change shares the SAME signal admin sees (single source of truth). Contract-stage
 * progression + advisor nomination stay admin-only.
 */
export default function WaitlistToSend() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/waitlist");
      if (res.ok) setLeads((await res.json()).leads || []);
    } catch {
      /* surfaced on action */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(lead: Lead, body: Record<string, unknown>, successText: string) {
    setBusy(lead.id);
    setMsg(null);
    try {
      const res = await fetch("/api/agent/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: lead.id, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: successText });
        load();
      } else {
        setMsg({ type: "error", text: data.error || "Action failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function sendForm(lead: Lead) {
    const already = !!lead.qualification_sent_at;
    if (!confirm(`${already ? "Re-send" : "Send"} the registration form to ${lead.name} (${lead.email})?`))
      return;
    setBusy(lead.id);
    setMsg(null);
    try {
      const res = await fetch("/api/agent/send-qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: lead.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: `Registration form sent to ${lead.name}.` });
        load();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to send." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  function withdraw(lead: Lead) {
    const reason_code = prompt(
      `Withdraw ${lead.name}. Reason — one of:\n${EXIT_REASONS.map((r) => r.code).join(", ")}`,
    );
    if (!reason_code) return;
    if (!EXIT_REASON_LABELS[reason_code]) {
      setMsg({ type: "error", text: "Unknown reason code" });
      return;
    }
    const note = prompt("Optional note:") || undefined;
    act(lead, { action: "withdraw", reason_code, note }, `${lead.name} withdrawn`);
  }

  const active = leads.filter((l) => l.pipeline_state === "active");
  const exited = leads.filter((l) => l.pipeline_state !== "active");
  const multiEstate = new Set(leads.map((l) => l.estate_slug)).size > 1;

  if (loading || leads.length === 0) return null;

  return (
    <section className="mb-8 border border-[#00B5AD]/30 bg-[#00B5AD]/5 rounded-xl p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900 mb-1">My buyers</h2>
      <p className="text-sm text-slate-600 mb-4 max-w-2xl">
        Your registered buyers and where each is up to. Move them along as you talk to them — mark
        them contacted, send the registration form, record a viewing, note their finance, or withdraw
        them with a reason. Everything here is shared with the Factory2Key team.
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

      <div className="space-y-2.5">
        {active.map((l) => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{l.name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {l.email}
                  {multiEstate ? ` · ${l.estate_name}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-white">
                  {stageLabel(l.pipeline_stage)}
                </span>
                {l.viewed_at && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">
                    Viewed
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {l.pipeline_stage === "enquiry" && (
                <ActBtn busy={busy === l.id} onClick={() => act(l, { action: "mark_contacted" }, `${l.name} marked contacted`)}>
                  Mark contacted
                </ActBtn>
              )}
              <ActBtn busy={busy === l.id} onClick={() => sendForm(l)}>
                {l.qualification_sent_at ? "Resend form" : "Send registration form"}
              </ActBtn>
              {!l.viewed_at && (
                <select
                  disabled={busy === l.id}
                  defaultValue=""
                  onChange={(e) => e.target.value && act(l, { action: "set_viewed", mode: e.target.value }, "Viewing recorded")}
                  className="text-xs border border-slate-300 rounded px-2 py-2 min-h-[40px]"
                >
                  <option value="">Record viewing…</option>
                  {VIEWED_MODES.map((m) => (
                    <option key={m} value={m}>{VIEWED_LABELS[m]}</option>
                  ))}
                </select>
              )}
              <select
                value={l.finance_status}
                disabled={busy === l.id}
                onChange={(e) => act(l, { action: "set_finance", finance_status: e.target.value }, "Finance updated")}
                className="text-xs border border-slate-300 rounded px-2 py-2 min-h-[40px]"
              >
                {FINANCE_STATUSES.map((f) => (
                  <option key={f} value={f}>{FINANCE_LABELS[f]}</option>
                ))}
              </select>
              <button
                disabled={busy === l.id}
                onClick={() => withdraw(l)}
                className="text-xs px-3 py-2 min-h-[40px] rounded border border-red-300 text-red-700 hover:bg-red-50 font-semibold disabled:opacity-50"
              >
                Withdraw…
              </button>
            </div>
          </div>
        ))}
      </div>

      {exited.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2">Withdrawn / on hold</p>
          <div className="space-y-1.5">
            {exited.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm bg-white/60 border border-slate-200 rounded px-3 py-2">
                <span className="text-slate-700">{l.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {l.pipeline_state === "withdrawn"
                      ? EXIT_REASON_LABELS[l.exit_reason ?? ""] ?? "Withdrawn"
                      : "On hold"}
                  </span>
                  <button
                    disabled={busy === l.id}
                    onClick={() => act(l, { action: "reactivate" }, `${l.name} reactivated`)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 font-medium disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActBtn({
  children,
  onClick,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs px-3 py-2 min-h-[40px] rounded-lg font-semibold bg-[#00B5AD] hover:bg-[#009a93] text-white disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}
