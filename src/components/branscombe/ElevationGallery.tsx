"use client";

import { useState } from "react";
import Image from "next/image";

const ELEVATIONS = [
  {
    group: "Type 1 (104m²)",
    items: [
      { src: "/branscombe/elevation-type1-scheme1.jpeg", label: "Scheme 1 — DA Approved", scheme: "Dulux Domino / Dieskau / Surfmist" },
      { src: "/branscombe/elevation-type1-scheme2.jpeg", label: "Scheme 2 — Dark Contemporary", scheme: "Dulux Domino / Klavier / Monument" },
      { src: "/branscombe/elevation-type1-scheme3.jpeg", label: "Scheme 3 — Light Coastal", scheme: "Dulux Dieskau / Flooded Gum / Surfmist" },
    ],
  },
  {
    group: "Type 2 (114m²)",
    items: [
      { src: "/branscombe/elevation-type2-scheme1.jpeg", label: "Scheme 1 — DA Approved", scheme: "Dulux Domino / Dieskau / Surfmist" },
      { src: "/branscombe/elevation-type2-scheme2.jpeg", label: "Scheme 2 — Dark Contemporary", scheme: "Dulux Domino / Klavier / Monument" },
      { src: "/branscombe/elevation-type2-scheme3.jpeg", label: "Scheme 3 — Light Coastal", scheme: "Dulux Dieskau / Flooded Gum / Surfmist" },
    ],
  },
];

export default function ElevationGallery() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-10">
        {ELEVATIONS.map((group) => (
          <div key={group.group}>
            <h3 className="font-playfair text-xl font-black text-deep-blue mb-4">
              {group.group}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {group.items.map((elev) => (
                <button
                  key={elev.src}
                  type="button"
                  onClick={() => setExpanded(elev.src)}
                  className="bg-off-white p-2 border border-black/5 hover:border-[#00B5AD]/40 transition-colors cursor-pointer group text-left"
                >
                  <Image
                    src={elev.src}
                    alt={`${group.group} ${elev.label}`}
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                  <p className="font-archivo text-sm font-semibold text-deep-blue mt-2 group-hover:text-[#00B5AD] transition-colors">
                    {elev.label}
                  </p>
                  <p className="font-archivo text-[0.65rem] text-slate/50 mt-0.5">
                    {elev.scheme}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
            alt="Elevation — enlarged view"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
