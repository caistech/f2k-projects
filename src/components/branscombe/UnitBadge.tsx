"use client";

import { CSSProperties } from "react";

interface UnitBadgeProps {
  unitNumber: number;
  bg: string;
  border: string;
  isSelected: boolean;
  isHovered: boolean;
  registrationCount: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  ariaLabel: string;
}

export default function UnitBadge({
  unitNumber,
  bg,
  border,
  isSelected,
  isHovered,
  registrationCount,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
}: UnitBadgeProps) {
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
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        className="relative inline-flex items-center justify-between gap-1 rounded-full px-2 py-1 transition-all duration-100 cursor-pointer w-full"
        style={pillStyle}
      >
        <span
          className="font-archivo font-bold text-white leading-none"
          style={{ fontSize: "12px" }}
        >
          U{unitNumber}
        </span>
        <span
          className="font-archivo font-bold text-white/90 leading-none"
          style={{ fontSize: "11px" }}
          aria-hidden
        >
          {isSelected ? "✓" : "›"}
        </span>
        {registrationCount > 0 && !isSelected && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-[#1A2744] text-white rounded-full flex items-center justify-center font-archivo font-bold"
            style={{ width: "14px", height: "14px", fontSize: "8px" }}
          >
            {registrationCount}
          </span>
        )}
      </button>
    </div>
  );
}
