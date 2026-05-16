"use client";

import { usePreviewMode } from "./PreviewModeProvider";

/**
 * Sidebar toggle for Preview Mode. Rendered above the sign-out section so
 * it's visible without scrolling. Default styling sits visually distinct
 * from regular nav so admins notice the safety mode is on.
 */
export function PreviewModeToggle() {
  const { isPreview, setPreview } = usePreviewMode();

  return (
    <button
      type="button"
      onClick={() => setPreview(!isPreview)}
      aria-pressed={isPreview}
      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between border ${
        isPreview
          ? "bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30"
          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
      }`}
      title={
        isPreview
          ? "Preview mode is ON — writes are intercepted client-side"
          : "Turn on Preview Mode to test admin flows without persisting changes"
      }
    >
      <span className="flex items-center gap-2">
        <span className="text-base leading-none" role="img" aria-hidden>
          🧪
        </span>
        <span className="font-semibold">Preview mode</span>
      </span>
      <span
        className={`text-[0.6rem] tracking-wider uppercase font-bold ${
          isPreview ? "text-amber-200" : "text-slate-500"
        }`}
      >
        {isPreview ? "ON" : "OFF"}
      </span>
    </button>
  );
}

export default PreviewModeToggle;
