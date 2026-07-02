"use client";

import { useState } from "react";

export default function DataroomNdaPage() {
  const [signer, setSigner] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/funder/nda/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signer }),
      });
      const data = await res.json();
      if (res.ok) window.location.href = "/dataroom/documents";
      else setMsg(data.error || "Could not record acceptance");
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">Confidentiality undertaking</h1>
      <p className="text-sm text-slate-600 mb-4">
        Deep-dive material is provided in confidence. Please read and accept the undertaking below to
        unlock it. Your acceptance is recorded with a timestamp.
      </p>

      <div className="border border-slate-200 rounded-lg bg-white p-4 text-sm text-slate-700 leading-relaxed max-h-80 overflow-y-auto mb-4 space-y-2.5">
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          PLACEHOLDER — indicative wording only, pending Factory2Key&apos;s legal adviser. Not the final agreement.
        </p>
        <p className="font-semibold text-slate-900">Confidentiality Undertaking — Factory2Key Funder Data Room</p>
        <p><strong>1. Confidential Information.</strong> &ldquo;Confidential Information&rdquo; means all
          material made available to me in this data room marked or provided as deep-dive, including
          financial models, projections, costings, legal documents, plans, and any commercial terms,
          whether in document, image, or generated-answer form.</p>
        <p><strong>2. Purpose.</strong> The Confidential Information is provided solely so that I (and
          the institution I represent) may evaluate a potential funding relationship with Factory2Key.
          I will not use it for any other purpose.</p>
        <p><strong>3. Non-disclosure.</strong> I will keep the Confidential Information strictly
          confidential, will not disclose it to any third party without Factory2Key&apos;s prior written
          consent, and will limit access to those within my institution who need it for the Purpose and
          are bound by equivalent obligations.</p>
        <p><strong>4. No copying / return.</strong> I will not copy, reproduce, or retain the
          Confidential Information beyond what is necessary for the Purpose, and will destroy or return
          it on request.</p>
        <p><strong>5. No representation.</strong> The Confidential Information is provided for indicative
          assessment; figures are estimates and nothing here is an offer, an invitation, or financial
          product advice, and nothing is binding unless and until a separate written agreement is executed.</p>
        <p><strong>6. Term.</strong> These obligations continue notwithstanding that access is later
          withdrawn.</p>
        <p className="text-slate-400 text-xs pt-1">
          Final wording to be confirmed by Factory2Key&apos;s legal adviser before go-live; your
          acceptance is recorded with your name, timestamp and IP for the audit record.
        </p>
      </div>

      <form onSubmit={accept} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type your full legal name to accept</label>
          <input
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2.5 text-base min-h-[44px] focus:outline-none focus:border-[#1B3A5B]"
            required
          />
        </div>
        {msg && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{msg}</div>}
        <button
          type="submit"
          disabled={busy || signer.trim().length < 2}
          className="bg-[#1B3A5B] hover:bg-[#14293f] text-white px-6 py-3 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Recording…" : "Accept & unlock deep-dive"}
        </button>
      </form>
    </div>
  );
}
