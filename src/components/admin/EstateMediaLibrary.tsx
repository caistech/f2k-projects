"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HempHomesMedia } from "@/lib/hemp-homes/types";

function fmtBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

interface Props {
  /** e.g. /api/admin/estates/branscombe */
  apiBase: string;
  estateName: string;
}

/**
 * Estate media library — direct upload + per-item curation (Show on site toggle,
 * caption/alt edit, delete) + bulk "Hide all from gallery". Estate-agnostic:
 * drive into apiBase. New items default hidden; operator opts each into the
 * public gallery. (Google Drive sync is added per estate in a later step.)
 */
export default function EstateMediaLibrary({ apiBase, estateName }: Props) {
  const [media, setMedia] = useState<HempHomesMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/media`);
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
  }, [apiBase]);

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
      const res = await fetch(`${apiBase}/media`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Upload failed" });
        return;
      }
      setMessage({ type: "success", text: `Uploaded ${file.name} (hidden until you show it).` });
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

  async function patchMedia(id: string, body: Record<string, unknown>, okMsg?: string): Promise<boolean> {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Update failed" });
        return false;
      }
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.media } : m)));
      if (okMsg) setMessage({ type: "success", text: okMsg });
      return true;
    } catch {
      setMessage({ type: "error", text: "Network error" });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function toggleGallery(m: HempHomesMedia) {
    await patchMedia(
      m.id,
      { show_in_gallery: !m.show_in_gallery },
      !m.show_in_gallery ? "Now showing on the public site." : "Hidden from the public site.",
    );
  }
  async function saveCaption(m: HempHomesMedia, value: string) {
    if ((m.caption ?? "") === value.trim()) return;
    await patchMedia(m.id, { caption: value }, "Caption saved.");
  }
  async function deleteMedia(m: HempHomesMedia) {
    if (!confirm(`Delete this ${m.kind}? The file is removed permanently.`)) return;
    setBusyId(m.id);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/media/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Delete failed" });
        return;
      }
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      setMessage({ type: "success", text: "Deleted." });
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setBusyId(null);
    }
  }
  async function hideAllFromGallery() {
    const count = media.filter((m) => m.show_in_gallery).length;
    if (count === 0) {
      setMessage({ type: "success", text: "Nothing is showing on the public site." });
      return;
    }
    if (!confirm(`Hide all ${count} item(s) from the public gallery? Then toggle on just the ones you want to show.`)) return;
    setBulkBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_in_gallery: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Bulk hide failed" });
        return;
      }
      setMedia((prev) => prev.map((m) => ({ ...m, show_in_gallery: false })));
      setMessage({ type: "success", text: `Hid ${data.updated} item(s).` });
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setBulkBusy(false);
    }
  }

  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const publicCount = media.filter((m) => m.show_in_gallery).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{estateName} — Media Library</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Photos and video for the {estateName} blog and gallery. Upload here, then use the{" "}
          <em>Show on site</em> toggle to publish only the ones you want. New items are{" "}
          <strong>hidden from the public gallery by default</strong>.
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

      {/* Direct upload */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Upload</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Alt text (accessibility + AI context)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="e.g. Front elevation of the completed display home"
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Total media</div>
          <div className="text-2xl font-bold text-slate-900">{media.length}</div>
          <div className="text-xs text-slate-500 mt-1">{images.length} images · {videos.length} videos</div>
        </div>
        <div className="bg-white border rounded p-4 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-slate-500">In public gallery</div>
          <div className="text-2xl font-bold text-emerald-700">
            {publicCount}
            <span className="text-base font-normal text-slate-400"> / {media.length}</span>
          </div>
          <button
            type="button"
            onClick={hideAllFromGallery}
            disabled={bulkBusy || publicCount === 0}
            className="mt-2 self-start text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkBusy ? "Hiding…" : "Hide all from gallery"}
          </button>
        </div>
      </div>

      {/* Library grid */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-900">Library</div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading media…</div>
        ) : media.length === 0 ? (
          <div className="p-6 text-slate-500">No media yet. Upload above.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {media.map((m) => {
              const busy = busyId === m.id;
              return (
                <div
                  key={m.id}
                  className={`border rounded overflow-hidden bg-white ${
                    m.show_in_gallery ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200"
                  }`}
                >
                  <div className="relative">
                    {m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.public_url} alt={m.alt_text ?? ""} className="w-full h-40 object-cover bg-slate-100" />
                    ) : (
                      <video src={m.public_url} className="w-full h-40 object-cover bg-slate-900" controls={false} muted />
                    )}
                    <span
                      className={`absolute top-1.5 left-1.5 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded ${
                        m.show_in_gallery ? "bg-emerald-600 text-white" : "bg-slate-900/70 text-white"
                      }`}
                    >
                      {m.show_in_gallery ? "ON SITE" : "HIDDEN"}
                    </span>
                  </div>
                  <div className="p-2 text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="uppercase tracking-wider text-[0.6rem] font-semibold text-slate-500">{m.kind}</span>
                      <span className="text-[0.65rem] text-slate-400">{fmtBytes(m.byte_size)} · {fmtDate(m.created_at)}</span>
                    </div>
                    <input
                      type="text"
                      defaultValue={m.caption ?? ""}
                      placeholder="Caption (shown on the public site)"
                      disabled={busy}
                      onBlur={(e) => saveCaption(m, e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleGallery(m)}
                        className={`flex-1 text-[0.7rem] font-semibold px-2 py-2 rounded disabled:opacity-50 ${
                          m.show_in_gallery
                            ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        {busy ? "…" : m.show_in_gallery ? "✓ On site — hide" : "Show on site"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteMedia(m)}
                        aria-label="Delete media"
                        className="text-[0.7rem] font-semibold text-red-600 hover:text-red-800 px-2 py-2 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
