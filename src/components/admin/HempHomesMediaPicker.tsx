"use client";

import { useCallback, useEffect, useState } from "react";
import type { HempHomesMedia } from "@/lib/hemp-homes/types";

interface Props {
  value: string | null;
  onChange: (mediaId: string | null) => void;
  placeholder?: string;
  kind?: "image" | "video" | "all";
  /** API base for the media endpoint (per estate). Defaults to Hemp Homes. */
  apiBase?: string;
  /** Link target for the "upload some first" empty-state. */
  uploadHref?: string;
}

export function MediaPicker({
  value,
  onChange,
  placeholder = "Pick from library",
  kind = "image",
  apiBase = "/api/admin/hemp-homes",
  uploadHref = "/admin/hemp-homes/media",
}: Props) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<HempHomesMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/media`);
      if (!res.ok) return;
      const data = await res.json();
      setMedia(data.media ?? []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    // Lazy-load on first open OR when a value is set so we can render the preview.
    if ((open || value) && !loaded) load();
  }, [open, value, loaded, load]);

  const filtered = kind === "all" ? media : media.filter((m) => m.kind === kind);
  const selected = value ? media.find((m) => m.id === value) ?? null : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 border border-slate-300 rounded p-2 bg-slate-50">
        {selected ? (
          <>
            {selected.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.public_url}
                alt={selected.alt_text ?? ""}
                className="w-16 h-16 object-cover rounded bg-slate-200"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 rounded grid place-items-center text-xs text-white font-semibold">
                VIDEO
              </div>
            )}
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-semibold text-slate-900 truncate">
                {selected.alt_text || <span className="italic text-slate-500">no alt text</span>}
              </div>
              <div className="text-slate-500 truncate">{selected.caption || selected.storage_path}</div>
            </div>
          </>
        ) : value && !loaded ? (
          <div className="text-xs text-slate-500 flex-1">Loading selected media…</div>
        ) : value && loaded && !selected ? (
          <div className="text-xs text-red-600 flex-1">Selected media no longer exists in the library.</div>
        ) : (
          <div className="text-xs text-slate-500 flex-1 italic">{placeholder}</div>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs bg-white border border-slate-300 hover:border-slate-500 px-2 py-1 rounded font-semibold text-slate-700"
          >
            {selected ? "Change" : "Pick"}
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Pick {kind === "all" ? "media" : kind}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-900 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-5">
              {loading && !loaded ? (
                <div className="text-slate-500 text-sm">Loading library…</div>
              ) : filtered.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  No {kind === "all" ? "media" : `${kind}s`} in the library yet.{" "}
                  <a href={uploadHref} className="text-emerald-700 underline">
                    Upload some first →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map((m) => {
                    const isSelected = m.id === value;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onChange(m.id);
                          setOpen(false);
                        }}
                        className={`border-2 rounded overflow-hidden text-left hover:border-emerald-500 transition-colors ${
                          isSelected ? "border-emerald-600 ring-2 ring-emerald-200" : "border-slate-200"
                        }`}
                      >
                        {m.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.public_url}
                            alt={m.alt_text ?? ""}
                            className="w-full h-32 object-cover bg-slate-100"
                          />
                        ) : (
                          <video
                            src={m.public_url}
                            className="w-full h-32 object-cover bg-slate-900"
                            controls={false}
                            muted
                          />
                        )}
                        <div className="p-2 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="uppercase tracking-wider text-[0.6rem] font-semibold text-slate-500">
                              {m.kind}
                            </span>
                            {m.source === "drive" && (
                              <span className="text-[0.6rem] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                                DRIVE
                              </span>
                            )}
                          </div>
                          <div className="truncate mt-0.5 text-slate-500" title={m.alt_text ?? ""}>
                            {m.alt_text || <span className="italic text-slate-400">no alt text</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
