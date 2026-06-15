"use client";

import { useState } from "react";
import Image from "next/image";

// Joey ADU colour-scheme renders (Unison/Luke Tingley, 2026-06-15). One dwelling
// shown in four exterior colourways so a buyer can picture the finish. Mirrors the
// Branscombe ElevationGallery pattern: a plain-English colour tag leads each caption
// with the Colorbond/Dulux spec name kept in muted text. Colours + hex are taken
// verbatim from the per-scheme material specifications supplied with the renders —
// not estimated (timber decking is marked as a visual approximation).
//
// Scheme 02 ("Mineral Grey") was supplied with a manufacturer title bar burned in;
// it is cropped out in scripts/process-joey-renders.mjs before the image is public.

type Finish = { part: string; name: string; colour: string; hex: string; note?: string };

const SCHEMES: {
  id: string;
  label: string;
  tag?: string;
  blurb: string;
  finishes: Finish[];
}[] = [
  {
    id: "coastal",
    label: "Coastal Off-White",
    tag: "FEATURED",
    blurb: "Soft cream weatherboard + render — the lightest, most coastal of the four.",
    finishes: [
      { part: "Main cladding", name: "Surfmist", colour: "Colorbond Surfmist", hex: "#E4E2D5" },
      { part: "Feature panels", name: "Natural White", colour: "Dulux Natural White", hex: "#EEECE5" },
      { part: "Deck", name: "Silver-Top Ash", colour: "natural timber", hex: "#C8A97E", note: "approx" },
      { part: "Glazing", name: "Dark frames", colour: "architectural aluminium", hex: "#3A3A3A" },
    ],
  },
  {
    id: "charcoal",
    label: "Monochromatic Charcoal",
    blurb: "Deep charcoal cladding with gunmetal feature panels — bold and contemporary.",
    finishes: [
      { part: "Main cladding", name: "Charcoal", colour: "Dulux Domino", hex: "#3C3E3F" },
      { part: "Feature panels", name: "Gunmetal", colour: "Colorbond Monument", hex: "#323233" },
      { part: "Deck", name: "Silver-Top Ash", colour: "natural timber", hex: "#C8A97E", note: "approx" },
    ],
  },
  {
    id: "mineral-grey",
    label: "Mineral Grey",
    blurb: "Cool slate-grey cladding lifted with a crisp stone-grey accent.",
    finishes: [
      { part: "Main cladding", name: "Mineral Slate", colour: "Colorbond Basalt", hex: "#6D6C6E" },
      { part: "Accent", name: "Stone Grey", colour: "Dulux Dieskau", hex: "#CBC9C5" },
      { part: "Feature panels", name: "Pewter", colour: "Dulux Pewter Frame", hex: "#6D6C68" },
      { part: "Deck", name: "Silver-Top Ash", colour: "natural timber", hex: "#C8A97E", note: "approx" },
    ],
  },
  {
    id: "contemporary-greys",
    label: "Contemporary Greys",
    blurb: "A multi-textured layering of charcoal, stone and gunmetal across the facade.",
    finishes: [
      { part: "Primary", name: "Charcoal", colour: "Dulux Domino", hex: "#3C3E3F" },
      { part: "Light panels", name: "Stone Grey", colour: "Dulux Dieskau", hex: "#CBC9C5" },
      { part: "Mid panels", name: "Mineral Grey", colour: "Colorbond Basalt", hex: "#6D6C6E" },
      { part: "Feature", name: "Gunmetal", colour: "Colorbond Monument", hex: "#323233" },
    ],
  },
];

export default function JoeyRenderGallery() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mt-12 border-t border-black/5 pt-10">
      <p className="font-ibm-mono text-xs tracking-[0.4em] uppercase text-[#00B5AD] mb-3">
        Joey — choose your colour scheme
      </p>
      <h3 className="font-playfair text-2xl font-black text-deep-blue leading-tight mb-2">
        The same Joey, four exterior looks
      </h3>
      <p className="text-slate font-archivo leading-relaxed mb-6 max-w-[760px]">
        The Joey ancillary dwelling comes in four standard exterior colour schemes.
        Tap any render to enlarge. Finishes are indicative — final selections are
        confirmed at contract.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCHEMES.map((scheme) => {
          const src = `/seafields/designs/joey/${scheme.id}.jpg`;
          return (
            <button
              key={scheme.id}
              type="button"
              onClick={() => setExpanded(src)}
              className="bg-white p-2 border border-black/5 hover:border-[#00B5AD]/40 transition-colors cursor-pointer group text-left"
            >
              <Image
                src={src}
                alt={`Joey ADU — ${scheme.label} colour scheme`}
                width={600}
                height={259}
                className="w-full h-auto object-cover rounded-sm"
              />
              <p className="font-archivo text-sm font-semibold text-deep-blue mt-2 group-hover:text-[#0E7C77] transition-colors">
                {scheme.label}
                {scheme.tag && (
                  <span className="ml-2 inline-block align-middle bg-[#00B5AD]/10 text-[#0E7C77] text-[0.75rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
                    {scheme.tag}
                  </span>
                )}
              </p>
              <p className="font-archivo text-xs text-slate/70 mt-1 leading-snug">
                {scheme.blurb}
              </p>
              <dl className="mt-2 space-y-1">
                {scheme.finishes.map((finish) => (
                  <div key={finish.part} className="flex items-start gap-1.5">
                    <span
                      className="mt-[3px] w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: finish.hex }}
                      aria-hidden="true"
                    />
                    <dt className="font-archivo text-[0.75rem] text-slate/60 shrink-0">
                      {finish.part}:
                    </dt>
                    <dd className="font-archivo text-[0.75rem] text-slate/80 font-medium">
                      {finish.name}
                      <span className="text-slate/40"> — {finish.colour}</span>
                      {finish.note && <span className="text-slate/40"> ({finish.note})</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>

      {/* Lightbox overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 text-white/80 hover:text-white text-3xl font-light z-[101]"
            aria-label="Close"
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expanded}
            alt="Joey ADU — enlarged render"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
