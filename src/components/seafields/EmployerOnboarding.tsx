"use client";

import { useState } from "react";
import Link from "next/link";
import EmployerVoiceAgent, { type VoiceMessage } from "./EmployerVoiceAgent";
import EmployerRegistrationForm from "./EmployerRegistrationForm";

/**
 * /seafields/employers — local-employer accommodation front door.
 *
 * THE CORE LOGIC IS THE FORK (brief): before any form fields, the employer chooses how they
 * want to secure staff accommodation:
 *   - "Own it"  → buy a house-and-land package → REDIRECT to the main Seafields buyer
 *                 registration (/seafields-estate?ref=employer). NO data captured here, NO row.
 *                 It is a plain navigation link — deliberately NOT a second registration form.
 *   - "Rent it (take-or-pay)" → reveal the take-or-pay voice agent + form below.
 *
 * The #1 failure mode the brief warns about is accidentally building a duplicate registration
 * form on the own-it side, so own-it is implemented purely as a <Link> — there is no own-it form
 * in this tree at all.
 */

// Source-tagged redirect target for the own-it path. The main Seafields RegistrationForm reads
// ?ref= and stores it verbatim in `source`, so employer-sourced buyers show up as source=employer.
const OWN_IT_HREF = "/seafields-estate?ref=employer";

const SOURCE_PAGE = "/seafields/employers";

type Path = "choose" | "rent";

export default function EmployerOnboarding() {
  const [path, setPath] = useState<Path>("choose");
  const [transcript, setTranscript] = useState<VoiceMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <div className="bg-off-white min-h-screen overflow-x-hidden">
      {/* Hero / explanatory header */}
      <section className="bg-[#142C44] text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <p className="font-ibm-mono text-xs tracking-[0.4em] uppercase text-[#C77F3A] mb-3">
            Seafields · Local employer accommodation
          </p>
          <h1 className="font-archivo text-3xl sm:text-4xl font-black leading-tight">
            Stop flying your team in and out.
          </h1>
          <p className="font-archivo text-white/70 text-base mt-4 max-w-2xl leading-relaxed">
            Many roles around Seafields only fly in/out because there&apos;s nowhere local to
            live. We&apos;re building that housing — and you can secure staff accommodation two
            ways. Tell us which fits, and we&apos;ll point you the right way.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* THE FORK — always the first decision, before any fields */}
        <div className="mb-10">
          <h2 className="font-archivo text-xl font-black text-deep-blue mb-1">
            How do you want to secure staff accommodation?
          </h2>
          <p className="font-archivo text-base text-slate mb-5">
            Two paths. Owning sends you to our standard buyer registration; renting opens a
            take-or-pay form here.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Own it — pure redirect, NO form here */}
            <Link
              href={OWN_IT_HREF}
              className="group block border border-black/10 bg-white p-5 hover:border-[#1B3A5B] transition-colors"
            >
              <span className="font-archivo font-black text-deep-blue text-lg">Own it</span>
              <span className="block font-archivo text-base text-slate mt-1 leading-relaxed">
                Buy a house-and-land package and use it for staff. Takes you to the standard
                Seafields buyer registration.
              </span>
              <span className="inline-block font-archivo text-base font-semibold text-[#1B3A5B] mt-3 group-hover:underline">
                Go to buyer registration →
              </span>
            </Link>

            {/* Rent it — reveals the take-or-pay form */}
            <button
              type="button"
              onClick={() => setPath("rent")}
              className={`text-left block border p-5 transition-colors ${
                path === "rent"
                  ? "border-[#1B3A5B] bg-[#1B3A5B]/[0.04]"
                  : "border-black/10 bg-white hover:border-[#1B3A5B]"
              }`}
            >
              <span className="font-archivo font-black text-deep-blue text-lg">
                Rent it (take-or-pay)
              </span>
              <span className="block font-archivo text-base text-slate mt-1 leading-relaxed">
                Reserve a guaranteed number of beds for a fixed term, without owning. Open the
                take-or-pay form here.
              </span>
              <span className="inline-block font-archivo text-base font-semibold text-[#1B3A5B] mt-3">
                {path === "rent" ? "Selected — form below ↓" : "Choose take-or-pay →"}
              </span>
            </button>
          </div>
        </div>

        {/* Rent-it path: voice agent + take-or-pay form */}
        {path === "rent" && (
          <div className="space-y-8">
            <EmployerVoiceAgent
              transcript={transcript}
              onTranscriptChange={setTranscript}
              onConversationId={setConversationId}
            />
            <EmployerRegistrationForm
              voiceTranscript={transcript}
              voiceConversationId={conversationId}
              sourcePage={SOURCE_PAGE}
              onSwitchToOwnIt={() => {
                window.location.href = OWN_IT_HREF;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
