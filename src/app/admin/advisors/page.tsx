"use client";

import { useCallback, useEffect, useState } from "react";

interface Advisor {
  id: string;
  name: string;
  firm: string | null;
  type: "mortgage_broker" | "financial_advisor";
  email: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  mortgage_broker: "Mortgage broker",
  financial_advisor: "Financial advisor",
};

const empty = {
  name: "",
  firm: "",
  type: "mortgage_broker" as Advisor["type"],
  email: "",
  phone: "",
  notes: "",
};

export default function AdminAdvisorsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<Advisor | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advisors");
      if (res.ok) setAdvisors((await res.json()).advisors || []);
      else setMsg({ type: "error", text: "Failed to load" });
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(a: Advisor) {
    const res = await fetch(`/api/admin/advisors/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: `${a.name} ${a.active ? "deactivated" : "activated"}` });
      load();
    } else setMsg({ type: "error", text: "Update failed" });
  }

  async function remove(a: Advisor) {
    if (!confirm(`Delete ${a.name}? Existing buyer nominations are cleared; their history is kept.`)) return;
    const res = await fetch(`/api/admin/advisors/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: `${a.name} deleted` });
      load();
    } else setMsg({ type: "error", text: "Delete failed" });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Brokers &amp; advisors</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        The mortgage brokers and financial advisors Factory2Key refers buyers to when they need
        finance. Add the people on your panel here, then nominate one per buyer from the buyer&apos;s
        finance section in the pipeline. This is a directory only — advisors don&apos;t log in.
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

      <div className="flex justify-end mb-3">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="text-sm px-4 py-2 min-h-[40px] rounded-lg bg-[#00B5AD] hover:bg-[#009a93] text-white font-semibold"
        >
          + Add advisor
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : advisors.length === 0 ? (
        <div className="text-slate-400 text-sm border border-dashed rounded p-6 text-center">
          No brokers or advisors yet. Add your first one to start nominating them to buyers.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Contact</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {advisors.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{a.name}</div>
                    {a.firm && <div className="text-xs text-slate-500">{a.firm}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[a.type]}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {a.email && <div>{a.email}</div>}
                    {a.phone && <div>{a.phone}</div>}
                    {!a.email && !a.phone && "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        a.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setShowForm(true);
                        }}
                        className="text-xs px-2.5 py-1.5 min-h-[36px] rounded border border-slate-300 hover:bg-slate-50 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(a)}
                        className="text-xs px-2.5 py-1.5 min-h-[36px] rounded border border-slate-300 hover:bg-slate-50 font-medium"
                      >
                        {a.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => remove(a)}
                        className="text-xs px-2.5 py-1.5 min-h-[36px] rounded border border-red-300 text-red-700 hover:bg-red-50 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AdvisorForm
          advisor={editing}
          onClose={() => setShowForm(false)}
          onSaved={(text) => {
            setShowForm(false);
            setMsg({ type: "success", text });
            load();
          }}
          onError={(text) => setMsg({ type: "error", text })}
        />
      )}
    </div>
  );
}

function AdvisorForm({
  advisor,
  onClose,
  onSaved,
  onError,
}: {
  advisor: Advisor | null;
  onClose: () => void;
  onSaved: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [form, setForm] = useState(
    advisor
      ? {
          name: advisor.name,
          firm: advisor.firm ?? "",
          type: advisor.type,
          email: advisor.email ?? "",
          phone: advisor.phone ?? "",
          notes: advisor.notes ?? "",
        }
      : empty,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        advisor ? `/api/admin/advisors/${advisor.id}` : "/api/admin/advisors",
        {
          method: advisor ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (res.ok) onSaved(advisor ? `${form.name} updated` : `${form.name} added`);
      else onError(data.error || "Save failed");
    } catch {
      onError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full border border-slate-300 rounded px-3 py-2 text-sm min-h-[44px]";
  const label = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {advisor ? "Edit advisor" : "Add advisor"}
        </h3>
        <div className="space-y-3">
          <div>
            <label className={label}>Name *</label>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>Firm</label>
            <input className={input} value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} />
          </div>
          <div>
            <label className={label}>Type</label>
            <select
              className={input}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Advisor["type"] })}
            >
              <option value="mortgage_broker">Mortgage broker</option>
              <option value="financial_advisor">Financial advisor</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={input} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 min-h-[40px] rounded border border-slate-300 hover:bg-slate-50 font-medium">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="text-sm px-4 py-2 min-h-[40px] rounded bg-[#00B5AD] hover:bg-[#009a93] text-white font-semibold disabled:opacity-50">
            {busy ? "Saving…" : advisor ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
