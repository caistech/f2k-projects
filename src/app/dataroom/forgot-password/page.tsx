"use client";

import { useState } from "react";

export default function DataroomForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/dataroom/reset-password`,
      });
      setMsg(
        error
          ? { type: "error", text: error.message }
          : { type: "info", text: "If that email is registered, a reset link is on its way." },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#1B3A5B] mb-1">Reset your password</h1>
        <p className="text-sm text-slate-500 mb-6">We&apos;ll email you a link to set a new password.</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            required
            className="w-full border border-slate-300 rounded px-3 py-2.5 text-base min-h-[44px] focus:outline-none focus:border-[#1B3A5B]"
          />
          {msg && (
            <div className={`rounded px-3 py-2 text-sm ${msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-sky-50 border border-sky-200 text-sky-800"}`}>
              {msg.text}
            </div>
          )}
          <button type="submit" disabled={busy} className="w-full bg-[#1B3A5B] hover:bg-[#14293f] text-white px-5 py-3 min-h-[44px] rounded text-sm font-semibold disabled:opacity-50">
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6 text-center">
          <a href="/dataroom/login" className="underline hover:text-slate-700">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
