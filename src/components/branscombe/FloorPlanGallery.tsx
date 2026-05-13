"use client";

import { useState } from "react";
import Image from "next/image";

const PLANS = [
  {
    src: "/branscombe/floorplan-type1.png",
    alt: "Floor plan Type 1A and 1B — 104m² + 24m² deck",
    label: "Types 1A & 1B — 104m² + 24m² Deck",
    types: "U1, U2, U3, U7, U9, U11, U12, U14, U17, U19, U22, U23, U27, U28, U32, U33, U37",
  },
  {
    src: "/branscombe/floorplan-type2.png",
    alt: "Floor plan Type 2A, 2B and 2C — 114m² + 24m² deck",
    label: "Types 2A, 2B & 2C — 114m² + 24m² Deck",
    types: "U4, U5, U6, U8, U10, U13, U15, U16, U18, U20, U21, U24, U25, U26, U29, U30, U31, U34, U35, U36",
  },
];

export default function FloorPlanGallery() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <button
            key={plan.src}
            type="button"
            onClick={() => setExpanded(plan.src)}
            className="bg-white p-3 border border-black/5 hover:border-[#00B5AD]/40 transition-colors cursor-pointer group text-left"
          >
            <Image
              src={plan.src}
              alt={plan.alt}
              width={800}
              height={600}
              className="w-full h-auto"
            />
            <div className="mt-3">
              <p className="font-archivo text-sm font-semibold text-deep-blue group-hover:text-[#00B5AD] transition-colors">
                {plan.label}
              </p>
              <p className="font-archivo text-[0.65rem] text-slate/50 mt-1">
                Homes: {plan.types}
              </p>
              <p className="font-ibm-mono text-[0.6rem] tracking-wider text-[#00B5AD] mt-2 uppercase">
                Click to view full size
              </p>
            </div>
          </button>
        ))}
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
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light z-[101]"
            aria-label="Close"
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expanded}
            alt="Floor plan — enlarged view"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
