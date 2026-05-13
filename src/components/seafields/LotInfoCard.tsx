"use client";

import { useEffect } from "react";
import {
  CATEGORY_INFO,
  STAGE_INFO,
  type LotData,
} from "@/data/seafields";

interface AllocationDetail {
  allocated_to: string | null;
  dwelling_type: string | null;
  stage: string | null;
}

interface LotInfoCardProps {
  lot: LotData;
  registrationCount: number;
  allocation?: AllocationDetail;
  isSelected: boolean;
  bg: string;
  border: string;
  onClose: () => void;
  onToggle: () => void;
}

export default function LotInfoCard({
  lot,
  registrationCount,
  allocation,
  isSelected,
  bg,
  border,
  onClose,
  onToggle,
}: LotInfoCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isAllocated = !!allocation?.allocated_to;

  const statusText = isAllocated
    ? "Reserved"
    : registrationCount > 0
    ? `${registrationCount} ${
        registrationCount === 1 ? "person interested" : "interested"
      }`
    : "Available";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Lot ${lot.lotNumber} details`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 shadow-2xl"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-white/70 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="p-6 text-white">
          <p className="font-ibm-mono text-[0.6rem] tracking-[0.4em] uppercase text-white/60 mb-1">
            {lot.stage ? STAGE_INFO[lot.stage].title : "Stage TBD"}
          </p>
          <h3 className="font-playfair text-3xl font-black mb-4 leading-none">
            Lot {lot.lotNumber}
          </h3>

          <dl className="space-y-2 text-sm font-archivo">
            <Row label="Size" value={`${lot.area} m²`} />
            <Row
              label="Category"
              value={CATEGORY_INFO[lot.category].label}
            />
            <Row label="Zone" value={lot.zone} />
            <Row label="Status" value={statusText} />
          </dl>

          {lot.geometryPending && (
            <div className="mt-4 bg-amber-400/15 border border-amber-300/40 px-3 py-2 text-[11px] text-amber-100 leading-relaxed">
              <strong className="text-amber-200">Geometry pending CLE final survey.</strong>{" "}
              Boundary and area shown for this lot are indicative — the
              authoritative figures will be confirmed against the WAPC-approved
              survey.
            </div>
          )}

          <div className="mt-3 text-[10px] text-white/55 leading-snug">
            All lot details (size, shape, boundary, area, lot number) are
            indicative and subject to confirmation against the WAPC-approved
            deposited plan and final title survey prior to any contract of
            sale.
          </div>

          <div className="mt-6">
            {isAllocated ? (
              <div className="bg-white/10 border border-white/20 px-4 py-3 text-xs text-white/80 leading-relaxed">
                This lot is reserved and is not available for registration.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onToggle();
                  onClose();
                }}
                className={`w-full py-3 font-archivo font-semibold transition-colors ${
                  isSelected
                    ? "bg-white/20 hover:bg-white/30 text-white"
                    : "bg-white text-deep-blue hover:bg-white/90"
                }`}
              >
                {isSelected
                  ? "Remove from my registration"
                  : "Add to my registration"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/10 pb-1.5">
      <dt className="text-white/60 uppercase text-xs tracking-wider shrink-0">
        {label}
      </dt>
      <dd className="text-white font-semibold text-right">{value}</dd>
    </div>
  );
}
