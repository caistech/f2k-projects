"use client";

import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  full_name: string | null;
  firm: string | null;
  email: string;
  max_tier: string;
  deep_access_enabled: boolean;
  nda_accepted_at: string | null;
  status: string;
  created_at: string;
}
interface Doc {
  id: string;
  display_name: string;
  category: string;
  confidentiality_tier: string;
  format: string;
  created_at: string;
}
interface Audit {
  id: string;
  action: string;
  member_name: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

type Tab = "members" | "documents" | "log";

export default function AdminFunderDataroomPage() {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [log, setLog] = useState<Audit[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(async () => {
    const [m, d, l] = await Promise.all([
      fetch("/api/admin/funder-dataroom/members"),
      fetch("/api/admin/funder-dataroom/documents"),
      fetch("/api/admin/funder-dataroom/access-log"),
    ]);
    if (m.ok) setMembers((await m.json()).members || []);
    if (d.ok) setDocs((await d.json()).documents || []);
    if (l.ok) setLog((await l.json()).events || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchMember(id: string, body: Record<string, unknown>, text: string) {
    const res = await fetch(`/api/admin/funder-dataroom/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMsg({ type: "success", text });
      load();
    } else setMsg({ type: "error", text: "Update failed" });
  }

  async function deleteDoc(d: Doc) {
    if (!confirm(`Delete "${d.display_name}"? Funders will lose access to it.`)) return;
    const res = await fetch(`/api/admin/funder-dataroom/documents/${d.id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg({ type: "success", text: "Document deleted" });
      load();
    } else setMsg({ type: "error", text: "Delete failed" });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Funder data room</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-2xl">
        Manage which funders can access the data room, upload the documents they see, and review who
        has viewed what. Funders sign in at <code className="text-xs">/dataroom</code>, accept an NDA
        to unlock deep-dive material, and pull demand reports.
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded text-sm ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(["members", "documents", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-[#1B3A5B] text-[#1B3A5B]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t === "members" ? "Members" : t === "documents" ? "Documents" : "Access log"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowInvite(true)} className="text-sm px-4 py-2 min-h-[40px] rounded-lg bg-[#1B3A5B] hover:bg-[#14293f] text-white font-semibold">
              + Invite funder
            </button>
          </div>
          {members.length === 0 ? (
            <Empty>No funders invited yet.</Empty>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Funder</th>
                    <th className="text-left px-4 py-3 font-semibold">Access</th>
                    <th className="text-left px-4 py-3 font-semibold">NDA</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{m.full_name || "—"}</div>
                        <div className="text-xs text-slate-500">{m.email}{m.firm ? ` · ${m.firm}` : ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${m.max_tier === "deep" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {m.max_tier === "deep" ? "Deep-dive" : "Base"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {m.nda_accepted_at ? new Date(m.nda_accepted_at).toLocaleDateString("en-AU") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${m.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => patchMember(m.id, { deep_access_enabled: !m.deep_access_enabled }, m.deep_access_enabled ? "Deep access removed" : "Deep access enabled")}
                            className="text-xs px-2.5 py-1.5 min-h-[36px] rounded border border-slate-300 hover:bg-slate-50 font-medium"
                          >
                            {m.deep_access_enabled ? "Disable deep" : "Enable deep"}
                          </button>
                          <button
                            onClick={() => patchMember(m.id, { status: m.status === "active" ? "revoked" : "active" }, m.status === "active" ? "Access revoked" : "Reactivated")}
                            className={`text-xs px-2.5 py-1.5 min-h-[36px] rounded border font-medium ${m.status === "active" ? "border-red-300 text-red-700 hover:bg-red-50" : "border-slate-300 hover:bg-slate-50"}`}
                          >
                            {m.status === "active" ? "Revoke" : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div>
          <UploadForm onDone={(t) => { setMsg({ type: "success", text: t }); load(); }} onErr={(t) => setMsg({ type: "error", text: t })} />
          {docs.length === 0 ? (
            <Empty>No documents uploaded yet.</Empty>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white mt-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Document</th>
                    <th className="text-left px-4 py-3 font-semibold">Category</th>
                    <th className="text-left px-4 py-3 font-semibold">Tier</th>
                    <th className="text-left px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{d.display_name}<span className="text-xs text-slate-400 uppercase ml-2">{d.format}</span></td>
                      <td className="px-4 py-3 text-slate-600">{d.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.confidentiality_tier === "deep" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {d.confidentiality_tier === "deep" ? "Deep-dive" : "Base"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteDoc(d)} className="text-xs px-2.5 py-1.5 min-h-[36px] rounded border border-red-300 text-red-700 hover:bg-red-50 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div>
          {log.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
              {log.map((e) => (
                <div key={e.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-slate-700">
                    <span className="font-medium">{e.member_name}</span> · {e.action}
                    {e.detail && (e.detail as any).display_name ? ` · ${(e.detail as any).display_name}` : ""}
                    {e.detail && (e.detail as any).slug ? ` · ${(e.detail as any).slug}` : ""}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString("en-AU")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onDone={(t) => { setShowInvite(false); setMsg({ type: "success", text: t }); load(); }}
          onErr={(t) => setMsg({ type: "error", text: t })}
        />
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-slate-400 text-sm border border-dashed rounded p-6 text-center">{children}</div>;
}

function UploadForm({ onDone, onErr }: { onDone: (t: string) => void; onErr: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState("base");
  const [category, setCategory] = useState("financial");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput.files?.[0]) return onErr("Choose a file");
    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    fd.append("display_name", (form.elements.namedItem("display_name") as HTMLInputElement).value || fileInput.files[0].name);
    fd.append("category", category);
    fd.append("tier", tier);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/funder-dataroom/documents", { method: "POST", body: fd });
      if (res.ok) { onDone("Document uploaded"); form.reset(); }
      else onErr((await res.json()).error || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "border border-slate-300 rounded px-3 py-2 text-sm min-h-[40px]";
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border border-slate-200 rounded-lg bg-white p-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">File</label>
        <input name="file" type="file" className="text-sm" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Display name</label>
        <input name="display_name" className={input} placeholder="(defaults to filename)" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {["financial", "legal", "market", "project", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className={input}>
          <option value="base">Base</option>
          <option value="deep">Deep-dive (NDA)</option>
        </select>
      </div>
      <button type="submit" disabled={busy} className="text-sm px-4 py-2 min-h-[40px] rounded-lg bg-[#1B3A5B] hover:bg-[#14293f] text-white font-semibold disabled:opacity-50">
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function InviteModal({ onClose, onDone, onErr }: { onClose: () => void; onDone: (t: string) => void; onErr: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", firm: "", deep_access_enabled: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/funder-dataroom/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onDone(`Invited ${form.email}`);
      else onErr((await res.json()).error || "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full border border-slate-300 rounded px-3 py-2.5 text-sm min-h-[44px]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Invite a funder</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
            <input type="email" required className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
              <input className={input} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Firm</label>
              <input className={input} value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.deep_access_enabled} onChange={(e) => setForm({ ...form, deep_access_enabled: e.target.checked })} className="w-4 h-4 accent-[#1B3A5B]" />
            Enable deep-dive access (they still accept the NDA to unlock it)
          </label>
          <p className="text-xs text-slate-400">An invitation email with a sign-in link is sent to the funder.</p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 min-h-[40px] rounded border border-slate-300 hover:bg-slate-50 font-medium">Cancel</button>
          <button type="submit" disabled={busy || !form.email} className="text-sm px-4 py-2 min-h-[40px] rounded bg-[#1B3A5B] hover:bg-[#14293f] text-white font-semibold disabled:opacity-50">
            {busy ? "Inviting…" : "Send invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
