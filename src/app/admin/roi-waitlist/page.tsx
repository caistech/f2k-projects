"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_HINTS,
  FINANCE_STATUSES,
  FINANCE_LABELS,
  financeLabel,
  stageLabel,
  VIEWED_MODES,
  VIEWED_LABELS,
  EXIT_REASONS,
  EXIT_REASON_LABELS,
  type PipelineStage,
} from "@/lib/roi/pipeline";

interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  buyer_category: string | null;
  status: string;
  qualification_sent_at: string | null;
  qualification_sent_by: string | null;
  submitted_at: string;
  agent_name: string | null;
  introducing_agent_id: string | null;
  pipeline_stage: string;
  pipeline_state: string;
  exit_reason: string | null;
  exit_stage: string | null;
  exit_note: string | null;
  viewed_at: string | null;
  viewed_mode: string | null;
  finance_status: string;
  nominated_advisor_id: string | null;
  advisor_name: string | null;
  finance_conditional_amount: number | null;
}

interface AgentLite {
  id: string;
  name: string;
  estate_access: string[];
}

interface AdvisorLite {
  id: string;
  name: string;
  firm: string | null;
}

interface Metrics {
  waitlist_total: number;
  registered_count: number;
  finance_ready: number;
  attributed: number;
  unassigned: number;
  by_stage: Record<string, number>;
  by_state: Record<string, number>;
  drop_off: Record<string, number>;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  reason_code: string | null;
  note: string | null;
  actor_type: string | null;
  actor_email: string | null;
  created_at: string;
}

const ESTATE = "branscombe";

const financeBadgeClass = (s: string) =>
  s === "qualified" || s === "preapproved" || s === "cash"
    ? "bg-emerald-100 text-emerald-700"
    : s === "declined"
      ? "bg-red-100 text-red-700"
      : s === "needs_finance" || s === "in_assessment"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-500";

export default function AdminRoiWaitlistPage() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorLite[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<WaitlistRow | null>(null);
  const [showExited, setShowExited] = useState(false);
  const [showFunnel, setShowFunnel] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wlRes, agRes, mRes, advRes] = await Promise.all([
        fetch(`/api/admin/roi/waitlist?estate=${ESTATE}`),
        fetch("/api/admin/agents"),
        fetch(`/api/admin/roi/metrics?estate=${ESTATE}`),
        fetch("/api/admin/advisors?active=1"),
      ]);
      const wl = await wlRes.json();
      if (wlRes.ok) setRows(wl.waitlist || []);
      else setMsg({ type: "error", text: wl.error || "Failed to load" });
      if (agRes.ok) {
        const ag = await agRes.json();
        setAgents((ag.agents || []).filter((a: AgentLite) => a.estate_access?.includes(ESTATE)));
      }
      if (mRes.ok) setMetrics(await mRes.json());
      if (advRes.ok) setAdvisors((await advRes.json()).advisors || []);
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-sync the selected buyer with fresh data after an action.
  useEffect(() => {
    if (selected) {
      const fresh = rows.find((r) => r.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const active = rows.filter((r) => r.pipeline_state === "active");
  const exited = rows.filter((r) => r.pipeline_state !== "active");

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Buyer pipeline</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-3xl">
        Every Branscombe buyer&apos;s journey from waitlist enquiry to a signed contract. A buyer is
        only as far along as the gate they&apos;ve actually passed — &ldquo;Registered&rdquo; means
        they completed the signed qualification form, not just that they enquired. Click a buyer to
        advance them, record finance, mark a viewing, or withdraw them with a reason.
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

      {/* Honest funnel metrics (stage-based, not the old "qualified=completed form" conflation). */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {[
            { label: "On waitlist", value: metrics.waitlist_total },
            { label: "Registered+", value: metrics.registered_count },
            { label: "Finance-ready", value: metrics.finance_ready },
            { label: "Attributed", value: metrics.attributed },
            { label: "On hold", value: metrics.by_state?.on_hold ?? 0 },
            { label: "Withdrawn", value: metrics.by_state?.withdrawn ?? 0 },
          ].map((m) => (
            <div key={m.label} className="border border-slate-200 rounded-lg p-3 bg-white">
              <div className="text-2xl font-bold text-slate-900">{m.value}</div>
              <div className="text-xs text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel + drop-off analytics (Phase 5) — computed from the same metrics payload. */}
      {metrics && (
        <div className="mb-4">
          <button
            onClick={() => setShowFunnel((v) => !v)}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            {showFunnel ? "▾" : "▸"} Funnel &amp; drop-off
          </button>
          {showFunnel && <FunnelPanel metrics={metrics} />}
        </div>
      )}

      <div className="flex justify-end mb-3">
        <a
          href={`/api/admin/roi/export?estate=${ESTATE}`}
          className="text-xs px-3 py-2 min-h-[36px] inline-flex items-center rounded border border-slate-300 hover:bg-slate-50 font-semibold"
        >
          Export CSV
        </a>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          {/* Pipeline board — columns are the backbone stages; cards are active buyers.
              Horizontal scroll on mobile (responsive rule); each column is a fixed min-width. */}
          <div className="flex gap-3 overflow-x-auto pb-3">
            {PIPELINE_STAGES.map((stage) => {
              const inStage = active.filter((r) => r.pipeline_stage === stage);
              return (
                <div key={stage} className="min-w-[250px] w-[250px] shrink-0">
                  <div className="sticky top-0 bg-slate-50 border border-slate-200 rounded-t-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        {STAGE_LABELS[stage]}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-200">
                        {inStage.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {STAGE_HINTS[stage]}
                    </p>
                  </div>
                  <div className="border-x border-b border-slate-200 rounded-b-lg bg-slate-50/50 p-2 space-y-2 min-h-[80px]">
                    {inStage.map((r) => (
                      <BuyerCard key={r.id} row={r} onClick={() => setSelected(r)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exited buyers (on hold + withdrawn) — kept out of the board, surfaced on demand. */}
          {exited.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowExited((v) => !v)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                {showExited ? "▾" : "▸"} On hold &amp; withdrawn ({exited.length})
              </button>
              {showExited && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {exited.map((r) => (
                    <BuyerCard key={r.id} row={r} onClick={() => setSelected(r)} exited />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selected && (
        <BuyerDrawer
          row={selected}
          agents={agents}
          advisors={advisors}
          onClose={() => setSelected(null)}
          onChanged={(text) => {
            setMsg({ type: "success", text });
            load();
          }}
          onError={(text) => setMsg({ type: "error", text })}
        />
      )}
    </div>
  );
}

function FunnelPanel({ metrics }: { metrics: Metrics }) {
  const total = metrics.waitlist_total || 1;
  // Funnel = how many reached AT LEAST each backbone stage (cumulative from the far end).
  const stageOrder = [...PIPELINE_STAGES];
  const reachedAtOrBeyond: Record<string, number> = {};
  for (let i = 0; i < stageOrder.length; i++) {
    let sum = 0;
    for (let j = i; j < stageOrder.length; j++) sum += metrics.by_stage?.[stageOrder[j]] ?? 0;
    reachedAtOrBeyond[stageOrder[i]] = sum;
  }

  // Drop-off: keys are "exit_stage|reason_code".
  const drop = Object.entries(metrics.drop_off || {})
    .map(([k, n]) => {
      const [stage, reason] = k.split("|");
      return { stage, reason, n };
    })
    .sort((a, b) => b.n - a.n);
  const dropTotal = drop.reduce((s, d) => s + d.n, 0);

  return (
    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-5 border border-slate-200 rounded-lg p-4 bg-white">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Funnel — reached each gate</h3>
        <div className="space-y-1.5">
          {stageOrder.map((s) => {
            const n = reachedAtOrBeyond[s];
            const pct = Math.round((n / total) * 100);
            return (
              <div key={s} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-32 shrink-0">{STAGE_LABELS[s]}</span>
                <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
                  <div
                    className="bg-[#00B5AD] h-full rounded"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right shrink-0">
                  {n} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Drop-off — where &amp; why ({dropTotal})
        </h3>
        {drop.length === 0 ? (
          <p className="text-sm text-slate-400">No withdrawals recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {drop.map((d, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">
                    {EXIT_REASON_LABELS[d.reason] ?? d.reason}
                  </td>
                  <td className="py-1.5 text-slate-400 text-xs">
                    at {stageLabel(d.stage)}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-700">{d.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BuyerCard({
  row,
  onClick,
  exited,
}: {
  row: WaitlistRow;
  onClick: () => void;
  exited?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-lg p-2.5 hover:border-[#00B5AD] hover:shadow-sm transition-all"
    >
      <div className="font-medium text-slate-900 text-sm truncate">{row.name}</div>
      <div className="text-[11px] text-slate-400 truncate">{row.agent_name || "Unassigned"}</div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${financeBadgeClass(row.finance_status)}`}>
          {financeLabel(row.finance_status)}
        </span>
        {row.viewed_at && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">
            Viewed
          </span>
        )}
        {exited && row.pipeline_state === "withdrawn" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
            {EXIT_REASON_LABELS[row.exit_reason ?? ""] ?? "Withdrawn"}
          </span>
        )}
        {exited && row.pipeline_state === "on_hold" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
            On hold · {stageLabel(row.pipeline_stage)}
          </span>
        )}
      </div>
    </button>
  );
}

function BuyerDrawer({
  row,
  agents,
  advisors,
  onClose,
  onChanged,
  onError,
}: {
  row: WaitlistRow;
  agents: AgentLite[];
  advisors: AdvisorLite[];
  onClose: () => void;
  onChanged: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [note, setNote] = useState("");

  const loadTimeline = useCallback(async () => {
    const res = await fetch(`/api/admin/roi/timeline?waitlist_id=${row.id}`);
    if (res.ok) setEvents((await res.json()).events || []);
  }, [row.id]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  async function act(body: Record<string, unknown>, successText: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/roi/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: row.id, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        onChanged(successText);
        loadTimeline();
      } else {
        onError(data.error || "Action failed");
      }
    } catch {
      onError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function assign(agentId: string | null) {
    let reason: string | undefined;
    if (row.introducing_agent_id) {
      const r = prompt(`Re-assign ${row.name} from their current agent? Reason (logged):`);
      if (r == null) return;
      reason = r;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/roi/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: row.id, agent_id: agentId, reason }),
      });
      const data = await res.json();
      if (res.ok) onChanged(`${row.name} ${agentId ? "assigned" : "unassigned"}`);
      else onError(data.error || "Assign failed");
    } catch {
      onError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function sendForm() {
    if (!confirm(`Email the qualification form link to ${row.name} (${row.email})?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/roi/send-qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist_id: row.id }),
      });
      const data = await res.json();
      if (res.ok) onChanged(`Qualification form sent to ${row.name}`);
      else onError(data.error || "Failed to send");
    } catch {
      onError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    const reason_code = prompt(
      `Withdraw ${row.name}. Reason code — one of:\n${EXIT_REASONS.map((r) => r.code).join(", ")}`,
    );
    if (!reason_code) return;
    if (!EXIT_REASON_LABELS[reason_code]) {
      onError("Unknown reason code");
      return;
    }
    const detail = prompt("Optional note (context):") || undefined;
    await act({ action: "withdraw", reason_code, note: detail }, `${row.name} withdrawn`);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-xl p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{row.name}</h3>
            <p className="text-xs text-slate-500">{row.email}</p>
            {row.mobile && <p className="text-xs text-slate-500">{row.mobile}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none min-h-[44px] min-w-[44px]">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-800 text-white">
            {stageLabel(row.pipeline_stage)}
          </span>
          {row.pipeline_state !== "active" && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-200 text-amber-900">
              {row.pipeline_state === "withdrawn" ? "Withdrawn" : "On hold"}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${financeBadgeClass(row.finance_status)}`}>
            {financeLabel(row.finance_status)}
          </span>
        </div>

        {/* Stage control */}
        <Section title="Stage">
          <select
            value={row.pipeline_stage}
            disabled={busy}
            onChange={(e) => act({ action: "set_stage", stage: e.target.value }, "Stage updated")}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s as PipelineStage]}
              </option>
            ))}
          </select>
        </Section>

        {/* Agent */}
        <Section title="Introducing agent">
          <select
            value={row.introducing_agent_id ?? ""}
            disabled={busy}
            onChange={(e) => assign(e.target.value || null)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Section>

        {/* Finance milestone (advisor nomination dropdown lands in Phase 4) */}
        <Section title="Finance">
          <select
            value={row.finance_status}
            disabled={busy}
            onChange={(e) => act({ action: "set_finance", finance_status: e.target.value }, "Finance updated")}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]"
          >
            {FINANCE_STATUSES.map((f) => (
              <option key={f} value={f}>
                {FINANCE_LABELS[f]}
              </option>
            ))}
          </select>
          <label className="block text-[11px] text-slate-400 font-semibold mt-2 mb-1">
            Nominated broker / advisor
          </label>
          <select
            value={row.nominated_advisor_id ?? ""}
            disabled={busy}
            onChange={(e) =>
              act(
                { action: "set_finance", finance_status: row.finance_status, advisor_id: e.target.value || null },
                e.target.value ? "Advisor nominated" : "Advisor cleared",
              )
            }
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]"
          >
            <option value="">— None —</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firm ? `${a.name} (${a.firm})` : a.name}
              </option>
            ))}
          </select>
          {advisors.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              No advisors yet — add them under Brokers &amp; Advisors.
            </p>
          )}
        </Section>

        {/* Viewing milestone */}
        <Section title="Viewing">
          {row.viewed_at ? (
            <p className="text-sm text-slate-600">
              {VIEWED_LABELS[row.viewed_mode as keyof typeof VIEWED_LABELS] ?? "Viewed"} ·{" "}
              {new Date(row.viewed_at).toLocaleDateString("en-AU")}
            </p>
          ) : (
            <div className="flex gap-2">
              {VIEWED_MODES.map((m) => (
                <button
                  key={m}
                  disabled={busy}
                  onClick={() => act({ action: "set_viewed", mode: m }, "Viewing recorded")}
                  className="text-xs px-3 py-2 min-h-[40px] rounded border border-slate-300 hover:bg-slate-50 font-medium"
                >
                  {VIEWED_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Quick actions */}
        <Section title="Actions">
          <div className="flex flex-wrap gap-2">
            <ActionBtn disabled={busy} onClick={sendForm}>
              {row.qualification_sent_at ? "Resend form" : "Send qualification form"}
            </ActionBtn>
            {row.pipeline_state === "active" ? (
              <>
                <ActionBtn disabled={busy} onClick={() => act({ action: "hold" }, `${row.name} put on hold`)}>
                  Put on hold
                </ActionBtn>
                <ActionBtn disabled={busy} danger onClick={withdraw}>
                  Withdraw…
                </ActionBtn>
              </>
            ) : (
              <ActionBtn disabled={busy} onClick={() => act({ action: "reactivate" }, `${row.name} reactivated`)}>
                Reactivate
              </ActionBtn>
            )}
          </div>
          {row.pipeline_state === "withdrawn" && row.exit_reason && (
            <p className="text-xs text-red-600 mt-2">
              Withdrawn at {stageLabel(row.exit_stage ?? "")}: {EXIT_REASON_LABELS[row.exit_reason]}
              {row.exit_note ? ` — ${row.exit_note}` : ""}
            </p>
          )}
        </Section>

        {/* Add note */}
        <Section title="Add a note">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Logged to the timeline"
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]"
            />
            <ActionBtn
              disabled={busy || !note.trim()}
              onClick={() => act({ action: "add_note", note }, "Note added").then(() => setNote(""))}
            >
              Add
            </ActionBtn>
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-xs border-l-2 border-slate-200 pl-3">
                  <div className="text-slate-700">{describeEvent(e)}</div>
                  <div className="text-slate-400">
                    {new Date(e.created_at).toLocaleString("en-AU")} ·{" "}
                    {e.actor_type === "system" ? "system" : e.actor_email || e.actor_type}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function describeEvent(e: TimelineEvent): string {
  switch (e.event_type) {
    case "stage_change":
      return `Stage: ${stageLabel(e.from_value ?? "")} → ${stageLabel(e.to_value ?? "")}`;
    case "state_change":
      return `${e.to_value === "withdrawn" ? "Withdrawn" : e.to_value === "on_hold" ? "Put on hold" : "Reactivated"}${
        e.reason_code ? ` (${EXIT_REASON_LABELS[e.reason_code] ?? e.reason_code})` : ""
      }${e.note ? ` — ${e.note}` : ""}`;
    case "finance":
      return `Finance: ${financeLabel(e.from_value ?? "")} → ${financeLabel(e.to_value ?? "")}`;
    case "milestone":
      return e.to_value?.startsWith("viewed") ? "Marked as viewed" : `Milestone: ${e.to_value}`;
    case "note":
      return `Note: ${e.note}`;
    default:
      return e.event_type;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-2 min-h-[40px] rounded border font-semibold disabled:opacity-50 ${
        danger
          ? "border-red-300 text-red-700 hover:bg-red-50"
          : "border-[#00B5AD] text-[#00766f] hover:bg-[#00B5AD]/10"
      }`}
    >
      {children}
    </button>
  );
}
