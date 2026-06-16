import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EstateCard from "@/components/EstateCard";
import {
  ALL_STATE_ABBRS,
  STATE_NAMES,
  estatesInState,
  type StateAbbr,
} from "@/data/estates";

/**
 * /estates/[state] — the per-state page reached by clicking a state polygon on the landing map.
 * Lists every Factory2Key development in that state (or an honest empty state, so there are no
 * dead ends). Driven entirely by the estate registry — a new estate appears here automatically.
 */

function toAbbr(param: string): StateAbbr | null {
  const up = param.toUpperCase();
  return (ALL_STATE_ABBRS as string[]).includes(up) ? (up as StateAbbr) : null;
}

export function generateStaticParams() {
  return ALL_STATE_ABBRS.map((abbr) => ({ state: abbr.toLowerCase() }));
}

export const dynamicParams = false; // only the 8 real states/territories

export function generateMetadata({ params }: { params: { state: string } }): Metadata {
  const abbr = toAbbr(params.state);
  if (!abbr) return { title: "Developments | Factory2Key" };
  const name = STATE_NAMES[abbr];
  return {
    title: `${name} Developments | Factory2Key`,
    description: `Factory2Key residential developments in ${name}. Register your interest — real estate marketing only.`,
  };
}

export default function StatePage({ params }: { params: { state: string } }) {
  const abbr = toAbbr(params.state);
  if (!abbr) notFound();
  const name = STATE_NAMES[abbr];
  const estates = estatesInState(abbr);

  return (
    <div className="bg-off-white min-h-screen">
      <section className="py-12 md:py-16 px-4 border-b border-black/5">
        <div className="max-w-[1100px] mx-auto">
          <Link
            href="/"
            className="font-archivo text-sm text-slate hover:text-deep-blue inline-flex items-center gap-1 mb-6"
          >
            ← Back to the map
          </Link>
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-ember mb-4">
            {abbr} · Our Developments
          </p>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-black text-deep-blue leading-tight mb-4">
            {name}
          </h1>
          <p className="text-lg text-slate leading-relaxed font-archivo max-w-[750px]">
            {estates.length > 0
              ? `Factory2Key developments in ${name}. Choose an estate to view lots, homes and pricing, or to register your interest — no deposit is required or accepted. Real estate marketing only.`
              : `We don't have an active Factory2Key development in ${name} yet.`}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 px-4">
        <div className="max-w-[1100px] mx-auto">
          {estates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {estates.map((e) => (
                <EstateCard key={e.slug} estate={e} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-black/5 p-8 md:p-12 text-center max-w-[700px] mx-auto">
              <h2 className="font-playfair text-2xl font-black text-deep-blue mb-3">
                Nothing in {name} just yet
              </h2>
              <p className="font-archivo text-slate leading-relaxed mb-6">
                We&apos;re actively bringing new estates to market. If you&apos;re a landowner or
                developer with a site here, or a buyer who wants to be told the moment we launch
                nearby, we&apos;d like to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/developers"
                  className="bg-[#00B5AD] hover:bg-[#009E97] text-white px-6 py-3 font-archivo font-semibold transition-colors"
                >
                  I have a site →
                </Link>
                <Link
                  href="/"
                  className="border border-black/15 hover:border-deep-blue text-deep-blue px-6 py-3 font-archivo font-semibold transition-colors"
                >
                  See where we build →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
