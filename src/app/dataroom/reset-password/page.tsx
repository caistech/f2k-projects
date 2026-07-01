"use client";

import { useState } from "react";

export default function DataroomResetPasswordPage() {
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      setMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) setMsg({ type: "error", text: error.message });
      else window.location.href = "/dataroom";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#1B3A5B] mb-1">Set a new password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a new password for your data-room account.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              required
              className="w-full border border-slate-300 rounded px-3 py-2.5 text-base min-h-[44px] pr-16 focus:outline-none focus:border-[#1B3A5B]"
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-sm text-slate-500">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {msg && (
            <div className={`rounded px-3 py-2 text-sm ${msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-sky-50 border border-sky-200 text-sky-800"}`}>
              {msg.text}
            </div>
          )}
          <button type="submit" disabled={busy} className="w-full bg-[#1B3A5B] hover:bg-[#14293f] text-white px-5 py-3 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50">
            {busy ? "Saving…" : "Set password"}
          </button>
        </form>
      </div>
    </div>
  );
}
