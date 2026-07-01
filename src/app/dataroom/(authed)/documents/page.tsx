"use client";

import { useCallback, useEffect, useState } from "react";

interface Doc {
  id: string;
  display_name: string;
  category: string;
  confidentiality_tier: string;
  format: string;
  file_size: number | null;
  created_at: string;
}

export default function DataroomDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/funder/documents");
      if (res.ok) setDocs((await res.json()).documents || []);
      else setErr("Failed to load documents");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(d: Doc) {
    setOpening(d.id);
    setErr(null);
    try {
      const res = await fetch(`/api/funder/documents/${d.id}/download`);
      const data = await res.json();
      if (res.ok && data.url) window.open(data.url, "_blank", "noopener");
      else setErr(data.error || "Could not open the document");
    } catch {
      setErr("Network error");
    } finally {
      setOpening(null);
    }
  }

  // Group by category for a scannable list.
  const groups = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">Documents</h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        The project documents shared with you. Links are personal and time-limited. All access is
        logged. Please treat everything here as commercial-in-confidence.
      </p>

      {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="text-slate-400 text-sm border border-dashed rounded p-6 text-center">
          No documents have been shared yet.
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {Object.entries(groups).map(([cat, list]) => (
            <div key={cat}>
              <h2 className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">{cat}</h2>
              <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                {list.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{d.display_name}</div>
                      <div className="text-xs text-slate-400 uppercase">
                        {d.format}
                        {d.confidentiality_tier === "deep" ? " · deep-dive" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => open(d)}
                      disabled={opening === d.id}
                      className="text-sm px-3 py-2 min-h-[40px] rounded border border-[#1B3A5B] text-[#1B3A5B] hover:bg-[#1B3A5B]/5 font-semibold disabled:opacity-50 shrink-0"
                    >
                      {opening === d.id ? "Opening…" : "Open"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
