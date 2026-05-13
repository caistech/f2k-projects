"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  JOURNEY_ENTRIES,
  STAGES,
  STATES,
  type JourneyEntry,
  type JourneyStage,
  type JourneyState,
} from "@/data/hemp-homes/journey";

const ACCENT = "#1B4332";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function parseSet<T extends string>(
  value: string | null,
  allowed: readonly T[],
): Set<T> {
  if (!value) return new Set();
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return new Set(parts.filter((p): p is T => (allowed as readonly string[]).includes(p)));
}

function serializeSet(set: Set<string>): string | null {
  return set.size === 0 ? null : Array.from(set).join(",");
}

function StateBadge({ state }: { state: JourneyState }) {
  if (state === "completed") {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 bg-[#1B4332] text-off-white font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase"
      >
        Completed
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#1B4332] text-[#1B4332] font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#1B4332] motion-safe:animate-pulse"
          aria-hidden
        />
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-slate/40 text-slate/70 font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase">
      Scheduled
    </span>
  );
}

function StageChip({ stage }: { stage: JourneyStage }) {
  const label = STAGES.find((s) => s.value === stage)?.label ?? stage;
  return (
    <span className="inline-flex items-center px-2 py-0.5 font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-[#1B4332] border border-[#1B4332]/30">
      {label}
    </span>
  );
}

function EntryCard({ entry }: { entry: JourneyEntry }) {
  return (
    <article className="relative bg-white border border-black/5 p-6">
      <div
        className="hidden md:block absolute -left-[3.25rem] top-6 h-3 w-3 rounded-full bg-[#1B4332]"
        aria-hidden
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-slate/60">
          {entry.date}
        </span>
        <StateBadge state={entry.state} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <StageChip stage={entry.stage} />
      </div>
      <h3 className="font-playfair text-xl md:text-2xl text-deep-blue font-black leading-tight mb-3">
        {entry.title}
      </h3>
      <p className="text-slate font-archivo leading-relaxed">{entry.body}</p>
      {entry.image && (
        <figure className="mt-5">
          <div className="border border-black/10 bg-warm-grey/40 p-2">
            <Image
              src={entry.image.src}
              alt={entry.image.alt}
              width={entry.image.width}
              height={entry.image.height}
              className="w-full h-auto"
            />
          </div>
          {entry.image.caption && (
            <figcaption className="mt-2 font-archivo text-xs text-slate/60 leading-relaxed">
              {entry.image.caption}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
}

const stageValues = STAGES.map((s) => s.value);
const stateValues = STATES.map((s) => s.value);

export function JourneyTimeline() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeStages = useMemo(
    () => parseSet<JourneyStage>(searchParams.get("stage"), stageValues),
    [searchParams],
  );
  const activeStates = useMemo(
    () => parseSet<JourneyState>(searchParams.get("state"), stateValues),
    [searchParams],
  );

  const updateParam = useCallback(
    (key: "stage" | "state", value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const toggleStage = (s: JourneyStage) => {
    const next = new Set(activeStages);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    updateParam("stage", serializeSet(next));
  };

  const toggleState = (s: JourneyState) => {
    const next = new Set(activeStates);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    updateParam("state", serializeSet(next));
  };

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("stage");
    next.delete("state");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, {
      scroll: false,
    });
  };

  const filtered = useMemo(() => {
    return JOURNEY_ENTRIES.filter((entry) => {
      if (activeStages.size > 0 && !activeStages.has(entry.stage)) return false;
      if (activeStates.size > 0 && !activeStates.has(entry.state)) return false;
      return true;
    });
  }, [activeStages, activeStates]);

  return (
    <div>
      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STAGES.map((stage) => {
          const active = activeStages.has(stage.value);
          return (
            <button
              key={stage.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStage(stage.value)}
              className={cx(
                "inline-flex items-center px-3 py-2.5 font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-blue focus-visible:ring-offset-2",
                active
                  ? "bg-deep-blue text-off-white border-deep-blue"
                  : "bg-transparent text-slate border-black/10 hover:border-deep-blue",
              )}
            >
              {stage.label}
            </button>
          );
        })}
      </div>

      {/* State filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        <span className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-slate/60 mr-1">
          Filter by state:
        </span>
        {STATES.map((state) => {
          const active = activeStates.has(state.value);
          return (
            <button
              key={state.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggleState(state.value)}
              className={cx(
                "inline-flex items-center px-3 py-2.5 font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-blue focus-visible:ring-offset-2",
                active
                  ? "bg-deep-blue text-off-white border-deep-blue"
                  : "bg-transparent text-slate border-black/10 hover:border-deep-blue",
              )}
            >
              {state.label}
            </button>
          );
        })}
        {(activeStages.size > 0 || activeStates.size > 0) && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-2 font-archivo text-sm text-slate/70 hover:text-deep-blue border-b border-slate/20 hover:border-deep-blue pb-0.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div
          className="hidden md:block absolute left-3 top-0 bottom-0 w-px"
          style={{ backgroundColor: `${ACCENT}33` }}
          aria-hidden
        />
        <div className="space-y-6 md:pl-16">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-archivo text-slate/70 mb-2">
                No entries match these filters yet.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="font-archivo text-sm text-[#1B4332] border-b border-[#1B4332]/30 hover:border-[#1B4332] pb-0.5"
              >
                Reset filters &rarr;
              </button>
            </div>
          ) : (
            filtered.map((entry) => <EntryCard key={entry.id} entry={entry} />)
          )}
        </div>
      </div>
    </div>
  );
}
