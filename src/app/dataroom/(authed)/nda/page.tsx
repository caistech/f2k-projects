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

      <div className="border border-slate-200 rounded-lg bg-white p-4 text-sm text-slate-700 leading-relaxed max-h-72 overflow-y-auto mb-4">
        <p className="mb-2">
          By accepting, I agree that all deep-dive materials in this data room are confidential and
          commercial-in-confidence, are provided to me solely to assess a potential funding
          relationship with Factory2Key, and will not be disclosed, copied, or used for any other
          purpose without Factory2Key&apos;s written consent.
        </p>
        <p className="text-slate-400 text-xs">
          (Placeholder wording — final NDA text to be confirmed by Factory2Key&apos;s legal adviser
          before go-live.)
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
