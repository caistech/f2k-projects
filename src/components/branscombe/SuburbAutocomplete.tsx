"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Suburb/town autocomplete backed by Mapbox geocoding (AU-biased).
 *
 * Additive + graceful: if NEXT_PUBLIC_MAPBOX_TOKEN is absent or the request
 * fails, it behaves as a plain text input (no dropdown) — it can never block
 * the field. Selecting a suggestion fills the suburb and, when available, the
 * postcode. Suggestion rows are 44px tap targets with 16px text for mobile.
 */

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Suggestion {
  place: string;
  postcode?: string;
}

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onSelectPostcode?: (postcode: string) => void;
  className?: string;
  placeholder?: string;
}

export default function SuburbAutocomplete({
  id,
  value,
  onChange,
  onSelectPostcode,
  className,
  placeholder,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Skip the lookup immediately after the user picks a suggestion.
  const justSelected = useRef(false);

  useEffect(() => {
    if (!TOKEN || justSelected.current || value.trim().length < 3) {
      justSelected.current = false;
      setSuggestions([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json` +
          `?country=AU&types=place,locality,neighborhood&autocomplete=true&limit=5&access_token=${TOKEN}`;
        const res = await fetch(url, { signal: ctl.signal });
        if (!res.ok) return;
        const data = await res.json();
        const opts: Suggestion[] = (data.features || []).map(
          (f: { text?: string; place_name?: string; context?: { id?: string; text?: string }[] }) => {
            const pc = (f.context || []).find((c) => String(c.id).startsWith("postcode"));
            return { place: f.text || f.place_name || "", postcode: pc?.text };
          },
        );
        setSuggestions(opts.filter((o) => o.place));
        setOpen(true);
      } catch {
        /* network/abort — degrade to plain input */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (s: Suggestion) => {
    justSelected.current = true;
    onChange(s.place);
    if (s.postcode && onSelectPostcode) onSelectPostcode(s.postcode);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-black/10 shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li key={`${s.place}-${i}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-4 py-3 min-h-[44px] text-base font-archivo text-deep-blue hover:bg-[#00B5AD]/10 transition-colors"
              >
                {s.place}
                {s.postcode && (
                  <span className="text-slate/50 text-sm"> &middot; {s.postcode}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
