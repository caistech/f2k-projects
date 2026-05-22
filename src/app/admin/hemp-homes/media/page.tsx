// @explanatory-header-exempt — nested workflow page; entry-point header lives on /admin/hemp-homes
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HempHomesMedia } from "@/lib/hemp-homes/types";

function fmtBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface DriveStatus {
  connected: boolean;
  connected_email: string | null;
  folder_id: string | null;
  paused: boolean;
  last_sync_at: string | null;
  last_sync_files_seen: number | null;
  last_sync_files_new: number | null;
  last_sync_files_skipped: number | null;
  last_sync_message: string | null;
  connected_at: string | null;
}

export default function HempHomesMediaPage() {
  const search = useSearchParams();
  const [media, setMedia] = useState<HempHomesMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [syncErrors, setSyncErrors] = useState<{ file: string; reason: string }[]>([]);
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

  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hemp-homes/drive/status");
      if (!res.ok) return;
      const data = await res.json();
      setDrive(data);
    } catch {
      // Non-fatal — the rest of the page still works.
    }
  }, []);

  useEffect(() => {
    fetchMedia();
    fetchDriveStatus();
  }, [fetchMedia, fetchDriveStatus]);

  // Surface OAuth callback status from the URL.
  useEffect(() => {
    if (!search) return;
    if (search.get("connected") === "1") {
      setMessage({ type: "success", text: "Google Drive connected — click Sync now to pull files." });
    } else if (search.get("error")) {
      setMessage({ type: "error", text: `Drive connect failed: ${search.get("error")}` });
    }
  }, [search]);

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

  async function runSync() {
    setSyncing(true);
    setMessage(null);
    setSyncErrors([]);
    try {
      const res = await fetch("/api/admin/hemp-homes/drive/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Sync failed" });
        return;
      }
      const errs = data.errors ?? [];
      setSyncErrors(errs);
      setMessage({
        type: errs.length > 0 ? "error" : "success",
        text: data.message ?? "Sync complete",
      });
      fetchMedia();
      fetchDriveStatus();
    } catch {
      setMessage({ type: "error", text: "Network error during sync" });
    } finally {
      setSyncing(false);
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
          gallery page. Drop a file directly here, or connect your Google Drive
          folder and pull new files in bulk.
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

      {/* Drive sync section */}
      <div className="bg-white border rounded-lg p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-slate-900">Google Drive sync</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Pull image + video files from your Drive folder into the library.
              Files are mirrored into the <code className="text-[0.7rem]">hemp-homes-media</code> bucket
              and tagged <span className="font-mono text-[0.65rem]">DRIVE</span>.
              Sync is incremental — already-pulled files are skipped.
            </p>
            {drive?.folder_id && (
              <p className="text-[0.65rem] font-mono text-slate-400 mt-1">
                folder: {drive.folder_id}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {drive?.connected ? (
              <>
                <a
                  href="/api/admin/hemp-homes/drive/connect"
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Re-authorise
                </a>
                <button
                  type="button"
                  onClick={runSync}
                  disabled={syncing}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
                >
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
              </>
            ) : (
              <a
                href="/api/admin/hemp-homes/drive/connect"
                className="bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-sm font-semibold no-underline"
              >
                Connect Drive
              </a>
            )}
          </div>
        </div>
        {drive?.connected && (
          <div className="text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-500">Connected as:</span>{" "}
              <span className="font-medium">{drive.connected_email ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">Connected at:</span>{" "}
              <span>{fmtDate(drive.connected_at)}</span>
            </div>
            <div>
              <span className="text-slate-500">Last sync:</span>{" "}
              <span>{fmtDate(drive.last_sync_at)}</span>
            </div>
            <div>
              <span className="text-slate-500">Last run:</span>{" "}
              <span>{drive.last_sync_message ?? "—"}</span>
            </div>
          </div>
        )}
        {syncErrors.length > 0 && (
          <details className="mt-2 border-t border-slate-100 pt-2" open>
            <summary className="text-xs font-semibold text-red-700 cursor-pointer">
              {syncErrors.length} file{syncErrors.length === 1 ? "" : "s"} failed — click to view
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {syncErrors.map((e, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="font-mono text-red-700 shrink-0">✗</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900">{e.file}</span>
                    <span className="block text-slate-600">{e.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Direct upload */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Direct upload</h3>
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
          <div className="text-xs text-slate-500 mt-1">
            {drive?.connected ? "Use Sync now to pull more" : "Connect Drive above to enable"}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-900">
          Library
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading media…</div>
        ) : media.length === 0 ? (
          <div className="p-6 text-slate-500">No media yet. Upload above or sync from Drive.</div>
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
