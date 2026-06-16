import Link from "next/link";
import type { Estate } from "@/data/estates";

/**
 * EstateCard — the canonical development card, used by the landing page and the per-state pages.
 * Reads a single Estate from the registry. Estates without a render (e.g. concept-stage Dutton)
 * fall back to an accent-coloured placeholder instead of a broken image.
 */
export default function EstateCard({ estate: p }: { estate: Estate }) {
  return (
    <Link
      href={p.href}
      className="group bg-white border border-black/5 hover:border-[#00B5AD] transition-colors flex flex-col no-underline overflow-hidden"
    >
      <div className="aspect-[4/3] bg-warm-grey overflow-hidden">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={`${p.name} — ${p.location}`}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)` }}
          >
            <span className="font-playfair text-white/90 text-xl font-black px-4 text-center leading-tight">
              {p.shortName}
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-ember">
            {p.stateAbbr === "MULTI" ? "Multi-state" : p.stateAbbr} · {p.type}
          </span>
          <span className="font-archivo text-[0.65rem] font-bold uppercase tracking-wide bg-[#00B5AD]/10 text-[#00B5AD] px-2 py-0.5 rounded-sm whitespace-nowrap">
            {p.status}
          </span>
        </div>
        <h3 className="font-playfair text-xl font-black text-deep-blue leading-tight mb-1">
          {p.name}
        </h3>
        <p className="font-archivo text-sm text-slate/70 mb-3">
          {p.location} · {p.dwellings}
        </p>
        <p className="font-archivo text-sm text-slate leading-relaxed mb-4 flex-1">{p.blurb}</p>
        <span className="font-archivo text-sm font-semibold text-[#00B5AD] group-hover:underline mt-auto">
          {p.cta} →
        </span>
      </div>
    </Link>
  );
}
