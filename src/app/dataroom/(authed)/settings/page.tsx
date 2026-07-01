"use client";

import { useState } from "react";

async function browserClient() {
  const { createBrowserClient } = await import("@supabase/ssr");
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function DataroomSettingsPage() {
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      setMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const supabase = await browserClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      setMsg(error ? { type: "error", text: error.message } : { type: "info", text: "Password updated." });
      if (!error) setPw("");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = await browserClient();
    await supabase.auth.signOut();
    window.location.href = "/dataroom/login";
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#1B3A5B] mb-1">Settings</h1>
      <p className="text-sm text-slate-600 mb-6">Manage your data-room sign-in.</p>

      {msg && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={changePassword} className="border border-slate-200 rounded-lg bg-white p-4 mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Change password</label>
        <div className="relative mb-3">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2.5 text-base min-h-[44px] pr-16 focus:outline-none focus:border-[#1B3A5B]"
            placeholder="New password"
            autoComplete="new-password"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-sm text-slate-500">
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        <button type="submit" disabled={busy} className="bg-[#1B3A5B] hover:bg-[#14293f] text-white px-5 py-2.5 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50">
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>

      <button onClick={signOut} className="text-sm px-5 py-2.5 min-h-[44px] rounded border border-slate-300 hover:bg-slate-50 font-semibold">
        Sign out
      </button>
    </div>
  );
}
