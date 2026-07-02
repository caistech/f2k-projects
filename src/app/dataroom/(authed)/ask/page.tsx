"use client";

import { useState } from "react";

interface Citation {
  documentId: string;
  displayName: string;
  page: number | null;
}
interface Turn {
  q: string;
  a: string;
  citations: Citation[];
}

export default function DataroomAskPage() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (question.length < 3) return;
    setBusy(true);
    setErr(null);
    setQ("");
    try {
      const res = await fetch("/api/funder/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (res.ok) {
        setTurns((t) => [{ q: question, a: data.answer, citations: data.citations || [] }, ...t]);
      } else {
        setErr(data.error || "Could not get an answer");
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">Ask the data room</h1>
      <p className="text-sm text-slate-600 mb-5">
        Ask a question and get an answer drawn only from the documents you have access to, with the
        sources cited. It won&apos;t guess — if the answer isn&apos;t in the documents, it&apos;ll say so.
      </p>

      <form onSubmit={ask} className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. What's the total project cost and expected margin?"
          className="flex-1 border border-slate-300 rounded px-3 py-2.5 text-base min-h-[44px] focus:outline-none focus:border-[#1B3A5B]"
        />
        <button
          type="submit"
          disabled={busy || q.trim().length < 3}
          className="bg-[#1B3A5B] hover:bg-[#14293f] text-white px-5 py-2.5 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}

      <div className="space-y-5">
        {turns.map((t, i) => (
          <div key={i} className="border border-slate-200 rounded-lg bg-white p-4">
            <p className="text-sm font-semibold text-slate-900 mb-2">{t.q}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{t.a}</p>
            {t.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.citations.map((c) => (
                  <span key={c.documentId + (c.page ?? "")} className="text-[11px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                    {c.displayName}{c.page ? `, p.${c.page}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
