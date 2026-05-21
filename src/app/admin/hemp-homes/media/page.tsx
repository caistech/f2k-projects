// @explanatory-header-exempt — nested workflow page; entry-point header lives on /admin/hemp-homes
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HempHomesMedia } from "@/lib/hemp-homes/types";

function fmtBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HempHomesMediaPage() {
  const [media, setMedia] = useState<HempHomesMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hemp-homes/media");
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to load media" });
        return;
      }
      const data = await res.json();
      setMedia(data.media ?? []);
    } catch {
      setMessage({ type: "error", text: "Network error loading media" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (altText) fd.append("alt_text", altText);
      if (caption) fd.append("caption", caption);
      const res = await fetch("/api/admin/hemp-homes/media", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Upload failed" });
        return;
      }
      setMessage({ type: "success", text: `Uploaded ${file.name} (${fmtBytes(file.size)}).` });
      setAltText("");
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      fetchMedia();
    } catch {
      setMessage({ type: "error", text: "Network error during upload" });
    } finally {
      setUploading(false);
    }
  }

  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Media Library</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Photos and video that back posts, the public journey timeline, and the
          gallery page. Direct upload now; Google Drive sync (from your shared
          folder) ships next, alongside the LLM email generator that picks
          relevant images per post.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Upload</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Alt text (accessibility + LLM context)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="e.g. Workshop prototype with hemp panel walls partially finished"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Caption (shown on the public site)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 file:cursor-pointer disabled:opacity-50"
        />
        <p className="text-xs text-slate-500">
          Up to 500MB per file. JPEG / PNG / WebP / GIF for images, MP4 / WebM / MOV for video.
          {uploading && " · Uploading…"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Total media</div>
          <div className="text-2xl font-bold text-slate-900">{media.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {images.length} images · {videos.length} videos
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">From Drive</div>
          <div className="text-2xl font-bold text-slate-900">
            {media.filter((m) => m.source === "drive").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sync route ships next</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-900">
          Library
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading media…</div>
        ) : media.length === 0 ? (
          <div className="p-6 text-slate-500">No media yet. Upload above to seed the library.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {media.map((m) => (
              <div key={m.id} className="border border-slate-200 rounded overflow-hidden bg-slate-50">
                {m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.public_url}
                    alt={m.alt_text ?? ""}
                    className="w-full h-40 object-cover bg-slate-100"
                  />
                ) : (
                  <video src={m.public_url} className="w-full h-40 object-cover bg-slate-900" controls={false} muted />
                )}
                <div className="p-2 text-xs text-slate-600 space-y-0.5">
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
                  <div className="truncate text-slate-500" title={m.alt_text ?? ""}>
                    {m.alt_text || <span className="italic text-slate-400">no alt text</span>}
                  </div>
                  <div className="text-[0.65rem] text-slate-400">
                    {fmtBytes(m.byte_size)} · {fmtDate(m.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
