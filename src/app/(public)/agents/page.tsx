import { Metadata } from "next";
import Link from "next/link";
import DeveloperOnboarding from "@/components/developers/DeveloperOnboarding";

export const metadata: Metadata = {
  title: "For Agents — Bring an estate to Factory2Key | F2K",
  description:
    "Know a developer or landowner with an estate? Bring it to Factory2Key on their behalf, set it up under your name, and keep your buyers and your relationship. Already an F2K agent? Sign in to your portal.",
  openGraph: {
    title: "For Agents — Bring an estate to Factory2Key",
    description:
      "Bring a developer's estate to Factory2Key, own the relationship, and keep your buyers in your own portal.",
    url: "https://f2k-projects.vercel.app/agents",
    siteName: "Factory2Key Projects",
    type: "website",
  },
};

export default function AgentsPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative bg-[#1A2744] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#1A2744] to-[#00B5AD]/20" />
        <div className="relative max-w-[1100px] mx-auto px-4 py-20 md:py-24">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            For Real Estate Agents
          </p>
          <h1 className="font-playfair text-[clamp(2.25rem,5vw,3.75rem)] font-black leading-[1.1] mb-6 max-w-3xl">
            Know a developer with land? Bring their estate to F2K.
          </h1>
          <p className="text-xl text-white/70 font-archivo leading-relaxed mb-3 max-w-2xl">
            You already know the developers and landowners in your patch.
            Factory2Key turns their land into architecturally-designed modular
            home estates — and you bring the estate, set it up under your name,
            and stay the agent of record.
          </p>
          <p className="text-lg text-white/50 font-archivo max-w-2xl mb-8">
            You keep your buyers and your relationship; we handle the build,
            the lot allocations and delivery. Register an estate below — or, if
            you&apos;re already a Factory2Key agent, sign in to your portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#register-estate"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-[#00B5AD] hover:bg-[#009E97] text-white font-archivo font-semibold transition-colors no-underline"
            >
              Bring an estate to F2K
            </a>
            <Link
              href="/agent/login"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-white/30 hover:border-white/60 text-white font-archivo font-semibold transition-colors no-underline"
            >
              Agent sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== EXISTING AGENT SIGN-IN STRIP ===== */}
      <section className="bg-[#00B5AD]/5 border-b border-[#00B5AD]/20">
        <div className="max-w-[1100px] mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="font-archivo text-sm text-deep-blue">
            <strong>Already a Factory2Key agent?</strong> Sign in to your portal
            to track your buyers, see live availability and send registration
            forms.
          </p>
          <Link
            href="/agent/login"
            className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-deep-blue hover:bg-[#1A2744] text-white font-archivo font-semibold text-sm transition-colors no-underline"
          >
            Sign in to the agent portal →
          </Link>
        </div>
      </section>

      {/* ===== WHY BRING AN ESTATE TO F2K ===== */}
      <section className="bg-white border-b border-black/5">
        <div className="max-w-[1100px] mx-auto px-4 py-14">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-3">
            Why bring an estate to F2K
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-8 max-w-2xl">
            You own the estate on the platform — in conjunction with the
            developer.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Your name on the estate",
                body: "Bring it on the developer's behalf and you're the introducing agent. The estate is set up under you — you don't get cut out once the deal is done.",
              },
              {
                title: "Your own agent portal",
                body: "Every estate gives you a Factory2Key portal: your buyers, live (masked) availability, a referral link, and the registration forms to send them.",
              },
              {
                title: "Your buyers stay yours",
                body: "You see your buyers' full details; every other agent's stay private. You remain the agent of record for the buyers you bring.",
              },
              {
                title: "A product to sell, not just land",
                body: "Instead of a bare block, you're selling a finished house-and-land outcome — architecturally-designed modular homes buyers can picture and price.",
              },
              {
                title: "We do the heavy lifting",
                body: "Factory2Key acts as estate manager — leading feasibility, planning support, lot allocations, the build and delivery — so you can focus on selling.",
              },
              {
                title: "Free to bring",
                body: "Registering an estate is free. The basis is simply that Factory2Key acts as estate manager for the project (set out in the submission terms).",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="border border-black/5 bg-off-white p-5"
              >
                <h3 className="font-archivo font-bold text-deep-blue text-base mb-2">
                  {c.title}
                </h3>
                <p className="font-archivo text-sm text-slate leading-relaxed">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-white border-b border-black/5">
        <div className="max-w-[1100px] mx-auto px-4 py-10">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-6">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Tell us about the estate",
                body: "Talk to Morgan, our voice guide, or fill in the form below — with the developer / landowner's details and what you know about the site.",
              },
              {
                step: "2",
                title: "We set it up under you",
                body: "Factory2Key reviews it, talks the deal through with you and the developer, and stands up the estate page with you as the introducing agent.",
              },
              {
                step: "3",
                title: "You sell, in your portal",
                body: "You get your agent portal for the estate — your buyers, masked availability and the forms to register and qualify them.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="shrink-0 h-9 w-9 rounded-full bg-[#00B5AD] text-white font-playfair font-black flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-archivo font-bold text-deep-blue text-sm mb-1">
                    {s.title}
                  </h3>
                  <p className="font-archivo text-sm text-slate leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VOICE AGENT + FORM ===== */}
      <section id="register-estate" className="py-16 px-4 bg-off-white scroll-mt-24">
        <div className="max-w-[820px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            Register an estate
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-3">
            Bring a developer&apos;s estate to Factory2Key
          </h2>
          <p className="text-slate font-archivo leading-relaxed mb-8">
            Everything below is an enquiry only — no commitment on either side.
            Choose &ldquo;Real estate agent / broker&rdquo; as your role and
            we&apos;ll ask for the landowner / developer&apos;s details too, so
            we know who we&apos;ll ultimately be working with — and that
            you&apos;re the one who brought it.
          </p>

          {/* ===== WHAT YOU'LL NEED ===== */}
          <div className="bg-white border border-black/5 p-6 mb-8">
            <h3 className="font-archivo font-bold text-deep-blue text-base mb-1">
              What you&apos;ll need
            </h3>
            <p className="font-archivo text-sm text-slate/70 mb-4">
              Handy to have ready before you start — but don&apos;t go hunting.
              Bring what you have and leave the rest; Morgan and the form both
              let you skip anything you&apos;re not sure about.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                "Your details — you're the introducing agent for this estate",
                "The developer / landowner's details (name, and contact if you have it)",
                "The estate / project name and where it is (suburb & postcode)",
                "Planning / zoning status (zoned, DA lodged or approved, concept, or raw land)",
                "Whether the owner owns or controls the site (owned, under option, negotiating)",
                "The certificate of title, if you have it — it carries the accurate lot details",
                "Any plans, sketches, drawings or preferred house designs to upload",
                "Whether you have the owner's authority to bring it (or you'll arrange it)",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <svg
                    className="w-4 h-4 text-[#00B5AD] shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-archivo text-sm text-slate leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <DeveloperOnboarding />
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      {/* Extra bottom padding leaves clear space for the fixed SayFix pill (bottom-left) to rest
          over, so it doesn't overlap the contact links on mobile. */}
      <section className="pt-10 pb-28 sm:pb-16 px-4 bg-warm-grey">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="font-archivo text-sm text-slate mb-2">
            Prefer to talk to a person first?
          </p>
          <p className="font-archivo text-deep-blue font-semibold">
            Dennis McMahon —{" "}
            <a
              href="mailto:dennis@factory2key.com.au?subject=Agent%20estate%20enquiry"
              className="text-[#00B5AD] hover:underline"
            >
              dennis@factory2key.com.au
            </a>{" "}
            &middot;{" "}
            <a href="tel:+61402612471" className="text-[#00B5AD] hover:underline">
              +61 402 612 471
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
