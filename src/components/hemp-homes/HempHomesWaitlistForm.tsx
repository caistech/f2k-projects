"use client";

import { useState } from "react";

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "rate-limited" };

const I_AM_A_OPTIONS = [
  "Eco-community resident",
  "Eco-community member (not resident)",
  "Considering an eco-community",
  "Sustainable-build curious",
  "Industry",
  "Other",
] as const;

const SITUATION_OPTIONS = [
  "Downsizing",
  "Multigenerational living",
  "Key worker",
  "First home buyer",
  "Investing for family use",
  "Just want to follow the journey",
  "Other",
] as const;

const TIMEFRAME_OPTIONS = [
  "Next 12 months",
  "1–2 years",
  "2+ years",
  "No timeline yet",
] as const;

const FINANCE_OPTIONS = [
  "Pre-approved",
  "Looking into it",
  "Cash buyer",
  "Not yet relevant",
] as const;

const HEAR_ABOUT_OPTIONS = [
  "Search engine",
  "Social media",
  "Word of mouth",
  "Industry contact",
  "Other",
] as const;

const STATES = ["QLD", "NSW", "VIC", "TAS", "SA", "WA", "ACT", "NT"] as const;

const REGIONS = [
  { value: "QLD", label: "Queensland" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "TAS", label: "Tasmania" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "Northern Territory" },
  { value: "no_preference", label: "No preference — open to any region" },
] as const;

const CONFIG_OPTIONS = [
  "1-bed Joey60",
  "2-bed Joey60",
  "Not sure yet",
  "Other configuration",
] as const;

const JOURNEY_INTERESTS = [
  { value: "design", label: "Design progress" },
  { value: "material", label: "Material development" },
  { value: "engineering", label: "Engineering & testing" },
  { value: "prototyping", label: "Prototyping" },
  { value: "building", label: "Building" },
  { value: "certification", label: "Certification" },
  { value: "install", label: "The first install" },
  { value: "community", label: "Open days & community events" },
  { value: "all", label: "All of it" },
] as const;

const REFERRER_TYPES = [
  "Real Estate Agent",
  "Mortgage Broker",
  "Financial Adviser",
  "Friend or Family",
  "Other",
] as const;

const inputClass =
  "w-full border border-black/15 bg-white px-3 py-2.5 font-archivo text-sm focus:border-deep-blue focus:outline-none";
const labelClass =
  "block font-archivo text-sm font-semibold text-deep-blue mb-1.5";
const helperClass = "font-archivo text-xs text-slate/60 mt-1";

export default function HempHomesWaitlistForm() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [showReferrer, setShowReferrer] = useState(false);

  const [regions, setRegions] = useState<Set<string>>(new Set());
  const [journeyInterests, setJourneyInterests] = useState<Set<string>>(
    new Set(),
  );

  function toggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      full_name: String(formData.get("full_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: emptyToNull(formData.get("phone")),
      suburb: emptyToNull(formData.get("suburb")),
      state: emptyToNull(formData.get("state")),
      postcode: emptyToNull(formData.get("postcode")),
      i_am_a: emptyToNull(formData.get("i_am_a")),
      situation: emptyToNull(formData.get("situation")),
      timeframe: emptyToNull(formData.get("timeframe")),
      finance_status: emptyToNull(formData.get("finance_status")),
      hear_about: emptyToNull(formData.get("hear_about")),
      regions_of_interest: Array.from(regions),
      preferred_config: emptyToNull(formData.get("preferred_config")),
      build_preference: emptyToNull(formData.get("build_preference")),
      journey_interests: Array.from(journeyInterests),
      what_drew_you: emptyToNull(formData.get("what_drew_you")),
      referrer_type: emptyToNull(formData.get("referrer_type")),
      referrer_name: emptyToNull(formData.get("referrer_name")),
      referrer_company: emptyToNull(formData.get("referrer_company")),
      referrer_contact: emptyToNull(formData.get("referrer_contact")),
      notes: emptyToNull(formData.get("notes")),
      consent: formData.get("consent") === "on" ? true : false,
    };

    try {
      const res = await fetch("/api/hemp-homes/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setState({ kind: "success" });
        return;
      }
      if (res.status === 429) {
        setState({ kind: "rate-limited" });
        return;
      }
      const errBody = await res.json().catch(() => ({}));
      setState({
        kind: "error",
        message:
          errBody?.error ??
          "Something went wrong. Try again, or email us at dennis@factory2key.com.au",
      });
    } catch {
      setState({
        kind: "error",
        message:
          "Something went wrong. Try again, or email us at dennis@factory2key.com.au",
      });
    }
  }

  if (state.kind === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-white border border-black/5 p-10 text-center"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1B4332"
          strokeWidth="2"
          className="mx-auto mb-6 h-12 w-12"
        >
          <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="font-playfair text-2xl font-black text-deep-blue mb-2">
          You&apos;re on the waitlist.
        </h3>
        <p className="font-archivo text-slate leading-relaxed mb-6">
          Check your inbox for a confirmation.
        </p>
        <a
          href="#journey"
          className="inline-flex items-center gap-2 text-[#1B4332] hover:text-deep-blue font-archivo text-sm border-b border-[#1B4332]/30 hover:border-deep-blue pb-0.5"
        >
          Back to the journey <span aria-hidden>&rarr;</span>
        </a>
      </div>
    );
  }

  const disabled = state.kind === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {state.kind === "error" && (
        <div
          role="alert"
          className="bg-blood/5 border border-blood/20 text-blood font-archivo text-sm px-4 py-3"
        >
          {state.message}
        </div>
      )}
      {state.kind === "rate-limited" && (
        <div
          role="alert"
          className="bg-blood/5 border border-blood/20 text-blood font-archivo text-sm px-4 py-3"
        >
          You&apos;ve submitted recently. Try again in a few minutes.
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-5">
        {/* Contact */}
        <div>
          <label htmlFor="full_name" className={labelClass}>
            Full name <span className="text-blood">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-blood">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={30}
              autoComplete="tel"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
          <div>
            <label htmlFor="suburb" className={labelClass}>
              Suburb / town <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <input
              id="suburb"
              name="suburb"
              type="text"
              maxLength={100}
              autoComplete="address-level2"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="state" className={labelClass}>
              State <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <select
              id="state"
              name="state"
              defaultValue=""
              className={inputClass}
              autoComplete="address-level1"
            >
              <option value="">—</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="postcode" className={labelClass}>
              Postcode <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <input
              id="postcode"
              name="postcode"
              type="text"
              maxLength={4}
              inputMode="numeric"
              pattern="\d{4}"
              autoComplete="postal-code"
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {/* Interest profile */}
      <fieldset disabled={disabled} className="space-y-5">
        <legend className="font-playfair text-xl font-black text-deep-blue mb-2">
          About you
        </legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="i_am_a" className={labelClass}>
              I am a... <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <select id="i_am_a" name="i_am_a" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {I_AM_A_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="situation" className={labelClass}>
              Best describes my situation <span className="text-slate/50 font-normal">(optional)</span>
            </label>
            <select
              id="situation"
              name="situation"
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              {SITUATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="timeframe" className={labelClass}>
              When are you looking?
            </label>
            <select
              id="timeframe"
              name="timeframe"
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              {TIMEFRAME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="finance_status" className={labelClass}>
              Finance
            </label>
            <select
              id="finance_status"
              name="finance_status"
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              {FINANCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hear_about" className={labelClass}>
              How did you hear about us?
            </label>
            <select
              id="hear_about"
              name="hear_about"
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              {HEAR_ABOUT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Program-specific — build_preference is the most important field. */}
      <fieldset disabled={disabled} className="space-y-5">
        <legend className="font-playfair text-xl font-black text-deep-blue mb-2">
          What you&apos;re interested in
        </legend>

        <div className="border-l-2 border-[#1B4332] pl-4 py-1">
          <span className={labelClass}>
            How would you like to build?{" "}
            <span className="text-blood">*</span>
          </span>
          <p
            className={helperClass}
            style={{ marginTop: 0, marginBottom: "0.75rem" }}
          >
            The Joey60 Hemp Edition is designed for two build models. Pick
            whichever you prefer — both are fully supported.
          </p>
          <div className="space-y-2">
            {[
              {
                value: "owner_builder",
                title: "Built by me with my community",
                blurb:
                  "I want to assemble it on site with neighbours over a long weekend. F2K supplies the kit and supervision; the community does the work.",
              },
              {
                value: "built_for_you",
                title: "Built for me by F2K",
                blurb:
                  "I want F2K to handle the build. Same Joey60 Hemp Edition, same panel system — F2K supplies the build team and delivers it ready to live in.",
              },
              {
                value: "not_sure",
                title: "Show me both options",
                blurb:
                  "Not decided yet. Send me updates on both build models as the program progresses.",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 px-3 py-3 border border-black/10 hover:border-[#1B4332] cursor-pointer transition-colors bg-white"
              >
                <input
                  type="radio"
                  name="build_preference"
                  value={opt.value}
                  required
                  className="mt-1 h-4 w-4 accent-[#1B4332]"
                />
                <div>
                  <span className="block font-archivo font-semibold text-deep-blue text-sm mb-1">
                    {opt.title}
                  </span>
                  <span className="block font-archivo text-slate text-sm leading-relaxed">
                    {opt.blurb}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Regions of interest</span>
          <p className={helperClass} style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Select any that apply.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REGIONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 px-3 py-2.5 border border-black/10 hover:border-deep-blue cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={regions.has(r.value)}
                  onChange={() => toggleSet(setRegions, r.value)}
                  className="h-4 w-4 accent-[#1B4332]"
                />
                <span className="font-archivo text-sm text-slate">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="preferred_config" className={labelClass}>
            Preferred Joey60 configuration
          </label>
          <select
            id="preferred_config"
            name="preferred_config"
            defaultValue=""
            className={inputClass}
          >
            <option value="">—</option>
            {CONFIG_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelClass}>
            What part of the journey are you most interested in?
          </span>
          <p className={helperClass} style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Select any that apply.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {JOURNEY_INTERESTS.map((j) => (
              <label
                key={j.value}
                className="flex items-center gap-3 px-3 py-2.5 border border-black/10 hover:border-deep-blue cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={journeyInterests.has(j.value)}
                  onChange={() => toggleSet(setJourneyInterests, j.value)}
                  className="h-4 w-4 accent-[#1B4332]"
                />
                <span className="font-archivo text-sm text-slate">{j.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="what_drew_you" className={labelClass}>
            What drew you to this?{" "}
            <span className="text-slate/50 font-normal">(optional)</span>
          </label>
          <textarea
            id="what_drew_you"
            name="what_drew_you"
            rows={3}
            maxLength={2000}
            className={inputClass}
            placeholder="Tell us in a sentence or two — it helps us write the updates you actually want to read."
          />
        </div>
      </fieldset>

      {/* Optional referrer */}
      <fieldset disabled={disabled}>
        <button
          type="button"
          onClick={() => setShowReferrer((v) => !v)}
          className="inline-flex items-center gap-2 font-archivo text-sm text-slate/70 hover:text-deep-blue border-b border-slate/20 hover:border-deep-blue pb-0.5 mb-3"
        >
          {showReferrer ? "Hide referrer details" : "Were you referred? Add details (optional)"}
        </button>
        {showReferrer && (
          <div className="space-y-4 border-l-2 border-black/10 pl-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="referrer_type" className={labelClass}>
                  Referrer type
                </label>
                <select
                  id="referrer_type"
                  name="referrer_type"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">—</option>
                  {REFERRER_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="referrer_name" className={labelClass}>
                  Referrer name
                </label>
                <input
                  id="referrer_name"
                  name="referrer_name"
                  type="text"
                  maxLength={200}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="referrer_company" className={labelClass}>
                  Referrer company
                </label>
                <input
                  id="referrer_company"
                  name="referrer_company"
                  type="text"
                  maxLength={200}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="referrer_contact" className={labelClass}>
                  Referrer contact
                </label>
                <input
                  id="referrer_contact"
                  name="referrer_contact"
                  type="text"
                  maxLength={200}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </fieldset>

      {/* Notes */}
      <fieldset disabled={disabled}>
        <label htmlFor="notes" className={labelClass}>
          Notes or questions{" "}
          <span className="text-slate/50 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className={inputClass}
        />
      </fieldset>

      {/* Consent + submit */}
      <fieldset disabled={disabled} className="space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            required
            className="h-4 w-4 mt-1 accent-[#1B4332]"
          />
          <span className="font-archivo text-sm text-slate leading-relaxed">
            I understand this is a registration of interest only. No deposit
            is required or accepted. No legal or financial obligation is created
            by registering.{" "}
            <span className="text-blood">*</span>
          </span>
        </label>

        <p className="font-archivo text-xs text-slate/70">
          By submitting you agree to our{" "}
          <a href="/privacy" className="underline hover:text-deep-blue">
            Privacy Policy
          </a>
          .
        </p>

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#143728] disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3.5 font-archivo font-semibold transition-colors"
        >
          {state.kind === "loading" ? (
            <>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
              </svg>
              Joining the waitlist…
            </>
          ) : (
            <>
              Join the waitlist
              <span aria-hidden>&rarr;</span>
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
