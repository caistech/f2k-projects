"use client";

import { useEffect, useState } from "react";

export interface GalleryItem {
  id: string;
  kind: "image" | "video";
  public_url: string;
  alt_text: string | null;
  caption: string | null;
}

// Grid tiles load a small, server-resized thumbnail via Supabase Storage image
// transforms (Pro plan) instead of the full 3-4MB original. The lightbox still
// loads the full-res original. If transforms aren't enabled the render endpoint
// 404s — the <img> onError handler falls back to the original URL, so the
// gallery still works (just heavier).
function thumbUrl(publicUrl: string): string {
  if (!publicUrl.includes("/storage/v1/object/public/")) return publicUrl;
  const rendered = publicUrl.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  return `${rendered}?width=600&height=450&resize=cover&quality=70`;
}

export default function HempHomesGallery({ items }: { items: GalleryItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((i) => i.id === activeId) ?? null;

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const label = item.alt_text || item.caption || "Hemp Homes build photo";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              aria-label={`View: ${label}`}
              className="group block text-left bg-white border border-black/5 hover:border-[#1B4332]/40 transition-colors p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-blue focus-visible:ring-offset-2"
            >
              <div className="relative w-full h-56 bg-warm-grey/40 overflow-hidden">
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl(item.public_url)}
                    data-fallback={item.public_url}
                    onError={(e) => {
                      const el = e.currentTarget;
                      const fb = el.dataset.fallback;
                      if (fb && el.src !== fb) el.src = fb;
                    }}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <video
                      src={item.public_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white text-xl">
                        ▶
                      </span>
                    </span>
                  </>
                )}
              </div>
              {item.caption && (
                <p className="mt-2 font-archivo text-xs text-slate/60 leading-relaxed">
                  {item.caption}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox overlay — full-screen on every viewport */}
      {active && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setActiveId(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="absolute top-3 right-3 text-white/70 hover:text-white text-3xl font-light leading-none p-3 z-[101]"
            aria-label="Close"
          >
            &times;
          </button>
          {active.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.public_url}
              alt={active.alt_text || active.caption || "Hemp Homes build photo — enlarged"}
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={active.public_url}
              className="max-w-full max-h-[85vh]"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {active.caption && (
            <p
              className="mt-4 max-w-[800px] text-center font-archivo text-sm text-white/70 leading-relaxed"
              onClick={(e) => e.stopPropagation()}
            >
              {active.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
