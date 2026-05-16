"use client";

import { useEffect, useState } from "react";
import { usePreviewMode } from "./PreviewModeProvider";

/**
 * Sticky banner shown at the top of every admin page when Preview Mode is
 * active. Briefly flashes when an intercept fires so the admin gets
 * confirmation their action would have saved.
 */
export function PreviewModeBanner() {
  const { isPreview, setPreview } = usePreviewMode();
  const [flash, setFlash] = useState<{ url: string; method: string } | null>(
    null,
  );

  useEffect(() => {
    if (!isPreview) return;
    const onIntercept = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { url: string; method: string }
        | undefined;
      if (!detail) return;
      setFlash(detail);
      const t = window.setTimeout(() => setFlash(null), 2500);
      return () => window.clearTimeout(t);
    };
    window.addEventListener("admin-preview-intercepted", onIntercept);
    return () =>
      window.removeEventListener("admin-preview-intercepted", onIntercept);
  }, [isPreview]);

  if (!isPreview) return null;

  return (
    <div className="sticky top-0 z-40">
      <div className="bg-amber-500 text-amber-950 px-6 py-2 flex items-center gap-3 text-sm font-semibold border-b-2 border-amber-700 shadow-sm">
        <span className="text-lg leading-none" role="img" aria-hidden>
          🧪
        </span>
        <span className="flex-1">
          Preview mode is ON — changes you make are <strong>not saved</strong>{" "}
          to the live database. Reload to discard all preview edits.
        </span>
        {flash && (
          <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded font-mono">
            intercepted {flash.method} {flash.url.replace("/api/admin", "")}
          </span>
        )}
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded text-xs font-semibold"
        >
          Turn off
        </button>
      </div>
    </div>
  );
}

export default PreviewModeBanner;
