"use client";

import { useCallback, useEffect, useState } from "react";

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
}

/**
 * Agent portal — the "buyers awaiting their registration (second) form" panel. Lists the
 * agent's own attributed waitlist leads that still need the form, with a Send / Resend action
 * (POST /api/agent/send-qualification, gated to the agent's own leads). The sent state is the
 * SAME shared signal admin sees, so a send here shows in the admin pipeline and vice-versa.
 */
export default function WaitlistToSend() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/waitlist");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      /* surfaced on send; the panel just stays empty on a load miss */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(lead: Lead) {
    const already = !!lead.qualification_sent_at;
    if (
      !confirm(
        `${already ? "Re-send" : "Send"} the registration form to ${lead.name} (${lead.email})?`,
      )
    )
      return;
    setSending(lead.id);
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
      setSending(null);
    }
  }

  // Leads that haven't completed the form yet are the actionable ones.
  const pending = leads.filter((l) => l.status !== "qualified");
  const multiEstate = new Set(pending.map((l) => l.estate_slug)).size > 1;

  if (loading || pending.length === 0) return null;

  const awaitingCount = pending.filter((l) => !l.qualification_sent_at).length;

  return (
    <section className="mb-8 border border-[#00B5AD]/30 bg-[#00B5AD]/5 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-bold text-slate-900">Awaiting their registration form</h2>
        {awaitingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#00B5AD] text-white text-xs font-bold">
            {awaitingCount}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 mb-4 max-w-2xl">
        These buyers registered their interest. Send them the registration form to capture their
        preferred home(s) and indicative terms — the link is pre-filled with what they&apos;ve
        already given, so they don&apos;t re-enter it.
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

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Buyer</th>
              {multiEstate && <th className="text-left px-3 py-2 font-semibold">Estate</th>}
              <th className="text-left px-3 py-2 font-semibold">Form status</th>
              <th className="text-left px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.email}</div>
                </td>
                {multiEstate && <td className="px-3 py-2 text-slate-600">{l.estate_name}</td>}
                <td className="px-3 py-2">
                  {l.qualification_sent_at ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Sent {new Date(l.qualification_sent_at).toLocaleDateString("en-AU")} · awaiting reply
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Not sent
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => send(l)}
                    disabled={sending === l.id}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-[#00B5AD] hover:bg-[#009a93] text-white disabled:opacity-50 transition-colors"
                  >
                    {sending === l.id
                      ? "Sending…"
                      : l.qualification_sent_at
                        ? "Resend form"
                        : "Send registration form"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
