"use client";

import { useEffect, useState } from "react";

interface ShareLink {
  estate: string;
  label: string;
  url: string;
}

/**
 * Agent self-serve referral-link card (ROI portal).
 *
 * Wording is deliberately the ATTRIBUTION FACT — "you're recorded as the introduction" — not a
 * commission guarantee. The non-circumvention (commission) promise is a separate legal clause
 * still being finalised; the product copy must not assert it ahead of sign-off.
 */
export default function ShareLinkCard() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent/share-links")
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((d) => {
        if (!cancelled) setLinks(d.links || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function copy(url: string) {
    navigator.clipboard?.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
  }

  // Nothing to show (no ROI-enabled estate for this agent yet) — render nothing.
  if (!loading && links.length === 0) return null;

  return (
    <section className="mb-8 rounded-xl border border-[#00B5AD]/30 bg-[#00B5AD]/5 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Your referral link</h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-4 max-w-2xl">
        Share this link with your buyers — in listings, emails, socials or texts. Anyone who
        registers through it is automatically recorded as <strong>your introduction</strong> in our
        system, so you don&apos;t have to claim or track anyone. You&apos;ll see them under My
        Clients below.
      </p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading your link…</div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => (
            <div key={l.estate}>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{l.label}</div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={l.url}
                  onFocus={(e) => e.target.select()}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 min-h-[44px] text-sm bg-white focus:outline-none focus:border-[#00B5AD]"
                />
                <button
                  type="button"
                  onClick={() => copy(l.url)}
                  className="shrink-0 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-[#00B5AD] hover:bg-[#009a93] text-white transition-colors"
                >
                  {copied === l.url ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
