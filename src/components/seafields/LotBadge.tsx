"use client";

import { CSSProperties } from "react";

interface LotBadgeProps {
  lotNumber: number;
  area: number;
  bg: string;
  border: string;
  isSelected: boolean;
  isHovered: boolean;
  isAllocated: boolean;
  isDimmed?: boolean;
  registrationCount: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  ariaLabel: string;
}

export default function LotBadge({
  lotNumber,
  area,
  bg,
  border,
  isSelected,
  isHovered,
  isAllocated,
  isDimmed = false,
  registrationCount,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
}: LotBadgeProps) {
  const pillStyle: CSSProperties = {
    backgroundColor: bg,
    border: `2px solid ${border}`,
    transform: isHovered ? "scale(1.06)" : "scale(1)",
    zIndex: isHovered || isSelected ? 10 : 1,
    boxShadow: isHovered
      ? "0 4px 12px rgba(0,0,0,0.25)"
      : "0 1px 2px rgba(0,0,0,0.12)",
  };

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      style={isDimmed && !isSelected ? { opacity: 0.22 } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-label={ariaLabel}
        /*
          min-h-[44px] on mobile: this pill IS the lot selector, and selecting a
          lot is how a buyer registers. At px-2 py-1 it measured 73x24 on a
          375px viewport — comfortably bigger than the ~17x8 SVG region in plan
          view, but still under the 44px minimum for a primary action. Relaxed
          from sm: up, where a mouse makes the denser grid the better layout.
        */
        className="relative inline-flex items-center justify-between gap-1 rounded-full px-2 py-1 min-h-[44px] sm:min-h-0 transition-all duration-100 cursor-pointer w-full"
        style={pillStyle}
      >
        <span
          className="font-archivo font-bold text-white leading-none"
          style={{ fontSize: "12px" }}
        >
          {lotNumber}
        </span>
        <span
          className="font-archivo font-bold text-white/90 leading-none"
          style={{ fontSize: "11px" }}
          aria-hidden
        >
          {isSelected ? "✓" : "›"}
        </span>
        {registrationCount > 0 && !isSelected && !isAllocated && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-[#1A2744] text-white rounded-full flex items-center justify-center font-archivo font-bold"
            style={{ width: "14px", height: "14px", fontSize: "8px" }}
          >
            {registrationCount}
          </span>
        )}
      </button>
      {/*
        12px is the portfolio floor for any on-screen text; this was 9px, which
        is the lot's AREA — the single number a buyer compares lots on.
      */}
      <span
        className="font-archivo text-slate/70 leading-none"
        style={{ fontSize: "12px" }}
      >
        {area}m²
      </span>
    </div>
  );
}
