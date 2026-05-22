/**
 * Public unsubscribe confirmation page. Spam Act 2003 requires no-login
 * unsubscribe; this page is the landing surface after the API has flipped
 * the prospect's outreach_status to 'declined'.
 *
 * Query params:
 *   ?status=ok&community=<name>  — success
 *   ?error=<reason>              — token invalid, expired, or DB failed
 */

interface Props {
  searchParams: { status?: string; community?: string; error?: string };
}

export default function HempHomesUnsubscribePage({ searchParams }: Props) {
  const ok = searchParams.status === "ok";
  const err = searchParams.error;
  const community = searchParams.community ?? "";

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8 md:p-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-[#1B4332] mb-2">
          Hemp Homes for Eco-Communities
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A2744] mb-6">
          {ok ? "You're unsubscribed." : err ? "Unsubscribe failed." : "Unsubscribe."}
        </h1>

        {ok && (
          <>
            <p className="text-slate-700 leading-relaxed mb-4">
              {community ? (
                <>
                  We&apos;ve recorded the unsubscribe request for <strong>{community}</strong>. You won&apos;t
                  receive any further outreach emails from us.
                </>
              ) : (
                <>You won&apos;t receive any further outreach emails from us.</>
              )}
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              If this was a mistake, or if your community would like to be added back at any point,
              email <a className="text-[#1B4332] underline" href="mailto:dennis@factory2key.com.au">
                dennis@factory2key.com.au
              </a> directly.
            </p>
          </>
        )}

        {err && (
          <>
            <p className="text-slate-700 leading-relaxed mb-4">
              We couldn&apos;t process this unsubscribe request: <span className="font-mono text-sm">{err}</span>
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              The link may have been altered in transit, or your inbox may have stripped part of it.
              Email <a className="text-[#1B4332] underline" href="mailto:dennis@factory2key.com.au">
                dennis@factory2key.com.au
              </a> and we&apos;ll remove your community manually within one business day.
            </p>
          </>
        )}

        {!ok && !err && (
          <>
            <p className="text-slate-700 leading-relaxed mb-4">
              This page only takes effect when you click an unsubscribe link from one of our emails —
              there&apos;s nothing to do here directly.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              If you reached this page another way and want to opt out, email{" "}
              <a className="text-[#1B4332] underline" href="mailto:dennis@factory2key.com.au">
                dennis@factory2key.com.au
              </a>.
            </p>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500">
          Factory2Key Pty Ltd · Compliant with the Spam Act 2003 (Australia).
        </div>
      </div>
    </div>
  );
}
