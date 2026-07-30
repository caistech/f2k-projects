// @explanatory-header-exempt — auth surface (login / signup / password flows are self-explanatory by web convention)
"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useCanonicalOrigin } from "@/lib/use-canonical-origin";
import { PasswordField } from "@/components/admin/PasswordField";

export default function ResetPasswordPage() {
  useCanonicalOrigin();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Verify the user landed here with an active recovery session
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setSessionEmail(session?.user?.email ?? null);
    });
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setInfo("Password updated. Signing you in...");
    setTimeout(() => {
      window.location.href = "/admin";
    }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded bg-gold flex items-center justify-center font-bold text-navy">
            F2K
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Reset Password</h1>
            <p className="text-sm text-gray-500">F2K Admin Console</p>
          </div>
        </div>

        {hasSession === null && (
          <p className="text-sm text-gray-500" role="status">
            Checking your reset link…
          </p>
        )}

        {/*
          With no recovery session the form is unusable, so don't render it.
          Showing enabled, fillable password fields invites someone to type a new
          password and only find out it can't be saved once they submit — and
          leaves them on a page with no way onward. Give them the next action
          instead (PRODUCT_STANDARDS §9, zero dead ends).
        */}
        {hasSession === false && (
          <>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              This page needs the link from your password-reset email. The link opens it with
              an active reset session; on its own it can&apos;t change a password.
            </p>
            <a
              href="/admin/login"
              className="block w-full text-center bg-navy hover:bg-gray-800 text-white py-2.5 rounded-lg font-semibold transition-colors"
            >
              Request a new reset link
            </a>
          </>
        )}

        {hasSession && sessionEmail && (
          <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 mb-4">
            Resetting password for <span className="font-semibold">{sessionEmail}</span>.
            If that&apos;s not your account, close this tab and request a new link from the
            correct address.
          </p>
        )}

        <form
          onSubmit={handleReset}
          className={`space-y-4 ${hasSession === true ? "" : "hidden"}`}
        >
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
            minLength={8}
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {info && <p className="text-green-700 text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading || hasSession === false || !password || !confirm}
            className="w-full bg-navy hover:bg-gray-800 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
