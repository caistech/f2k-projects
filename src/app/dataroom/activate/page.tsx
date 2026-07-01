"use client";

import { useState } from "react";

export default function DataroomActivatePage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/dataroom` },
      });
      setMsg(
        error
          ? { type: "error", text: error.message }
          : { type: "info", text: "Check your email for a sign-in link." },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#1B3A5B] mb-1">Activate your access</h1>
        <p className="text-sm text-slate-500 mb-6">
          Factory2Key will have sent an invitation to your email — open that link to set your
          password. If you can&apos;t find it, enter your email below and we&apos;ll send a one-time
          sign-in link.
        </p>
        <form onSubmit={magicLink} className="space-y-4">
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
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6 text-center">
          <a href="/dataroom/login" className="underline hover:text-slate-700">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
