import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import HempHomesWaitlistForm from "@/components/hemp-homes/HempHomesWaitlistForm";
import { JourneyTimeline } from "@/components/hemp-homes/JourneyTimeline";
import { COMMUNITIES_PIPELINE } from "@/data/hemp-homes/communities-pipeline";

const ACCENT = "#1B4332";

export const metadata: Metadata = {
  title: "Hemp Homes for Eco-Communities — Walk the Journey | F2K",
  description:
    "Hemp-built 60m² dwellings for Australian eco-communities — in development. Follow the build from concept through engineering and certification. Registration of interest only, no deposit.",
};

const WHY_HEMP_TILES = [
  {
    eyebrow: "Carbon",
    title: "Carbon-negative as it grows",
    body: "Hemp draws CO₂ out of the atmosphere as it grows, and the carbon stays locked in the wall of the home for the life of the building. The opposite of concrete.",
  },
  {
    eyebrow: "Provenance",
    title: "Australian-grown, low-mile",
    body: "We are working with an Australian materials partner growing and processing hemp domestically. The aim is a wall whose material didn't cross an ocean to get there.",
  },
  {
    eyebrow: "Health",
    title: "Breathable, non-toxic, no off-gassing",
    body: "Hemp walls regulate humidity and don't off-gas the chemistry of conventional plasterboard. Better for your lungs, better for your land.",
  },
];

const PRINCIPLES = [
  {
    title: "Fit for purpose",
    body: "Designed against the lived needs of small-footprint sustainable living.",
  },
  {
    title: "Built toward certification",
    body: "Targeting the same residential standard as any conventional home — we'll publish the testing as it happens.",
  },
  {
    title: "Replicable & duplicable",
    body: "One panel system, multiple house configurations.",
  },
  {
    title: "Standardised for reuse",
    body: "Optimised for repeat manufacture across communities.",
  },
];

export default function HempHomesForEcoCommunitiesPage() {
  return (
    <>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-deep-blue text-white px-4 py-2 z-50"
      >
        Skip to main content
      </a>

      {/* ===== DISCLAIMER BANNER ===== */}
      <div className="bg-[#1A2744] text-white/80 text-xs font-archivo text-center py-2.5 px-4 leading-relaxed">
        <strong className="text-white">REGISTRATION OF INTEREST ONLY</strong> —
        No deposit is required or accepted. Registering does not create any
        legal or financial obligation.
      </div>

      <main id="main-content">
        {/* ===== HERO ===== */}
        <section className="relative bg-[#1A2744] text-white overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 70% 50%, ${ACCENT}33 0%, transparent 60%)`,
            }}
          />

          <div className="relative max-w-[1100px] mx-auto px-4 py-20 md:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p
                  className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
                  style={{ color: "#5EAA8B" }}
                >
                  A Factory2Key program
                </p>
                <h1 className="font-playfair text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.1] mb-6">
                  Hemp Homes for Eco-Communities
                </h1>
                <p className="text-xl text-white/70 font-archivo leading-relaxed mb-2">
                  For the communities already living the ethos.
                </p>
                <p className="text-lg text-white/50 font-archivo mb-6">
                  Follow the build, openly, before the first home is ready.
                </p>

                {/* Build-model callout — prominent in the hero */}
                <div
                  className="inline-flex items-start gap-3 mb-8 px-4 py-3 border-l-2 max-w-lg"
                  style={{
                    borderColor: "#5EAA8B",
                    backgroundColor: "rgba(27, 67, 50, 0.25)",
                  }}
                >
                  <p className="text-white/90 font-archivo text-sm leading-relaxed">
                    <strong className="text-white font-semibold">
                      Built by you, or built for you.
                    </strong>{" "}
                    The Joey60 Hemp Edition is designed for two models:
                    owner-build with your community, or fully built by an F2K
                    team. Your choice.
                  </p>
                </div>

                <p className="text-white/60 font-archivo leading-relaxed mb-8 max-w-lg">
                  We&apos;re building a 60m² hemp-panel dwelling — the Joey60
                  Hemp Edition — designed as a flat-pack panel kit that
                  assembles on site. Not a 3D modular box shipped whole, not a
                  conventional stick build. Engineered panels, designed for
                  community assembly or an F2K build team. For Australian
                  eco-communities along the eastern seaboard. The first
                  community will be named here once they&apos;ve given us
                  permission.
                </p>

                {/* Primary CTA */}
                <a
                  href="#waitlist"
                  className="inline-block bg-[#1B4332] hover:bg-[#143728] text-white px-8 py-3.5 font-archivo font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
                >
                  Walk the journey with us &rarr;
                </a>

                {/* Scroll cue — not a button */}
                <div className="mt-6">
                  <a
                    href="#journey"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white font-archivo text-sm border-b border-white/20 hover:border-white pb-0.5 transition-colors"
                  >
                    See the journey so far <span aria-hidden>↓</span>
                  </a>
                </div>
              </div>

              {/* Hero visual — Koala70 placeholder while Joey60 Hemp Edition renders are in development */}
              <div className="hidden lg:block">
                <div className="border border-white/10 bg-white/5 p-3 relative">
                  <Image
                    src="/hemp-homes/koala70-placeholder-exterior.png"
                    alt="Earlier F2K Koala70 modular home — placeholder image while the Joey60 Hemp Edition renders are in development"
                    width={1200}
                    height={840}
                    priority
                    className="w-full h-auto"
                  />
                  <span
                    className="absolute top-5 right-5 px-2 py-1 font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase bg-deep-blue/80 text-off-white"
                    style={{ borderLeft: `2px solid #5EAA8B` }}
                  >
                    Placeholder
                  </span>
                </div>
                <p className="mt-2 font-archivo text-[0.7rem] text-white/50 text-center max-w-md mx-auto leading-relaxed">
                  Image: F2K Koala70 (earlier modular model) — used as a
                  placeholder while the Joey60 Hemp Edition renders are
                  prepared. The Hemp Edition is a different design and uses
                  hemp panels in place of conventional cladding.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ETHOS OPENER ===== */}
        <section className="py-16 px-4 bg-off-white">
          <div className="max-w-[900px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              We hear you
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-8">
              We get it. The conventional housing model isn&apos;t built for how you live.
            </h2>
            <div className="space-y-5 text-slate font-archivo leading-relaxed">
              <p>
                If you live in or near a permaculture village, an eco-community,
                a co-housing project, or you&apos;ve been quietly building
                toward one — you already know what&apos;s wrong with the
                conventional model. Concrete, steel, plasterboard, vinyl.
                Materials with massive embodied carbon, off-gassing chemistry,
                and supply chains that stretch around the world. Houses built
                to be sold, not to be lived in for fifty years by people who
                care about the land they sit on.
              </p>
              <p>
                You&apos;ve seen owner-builds eat years of life, alternative-build
                projects stall on certification, and beautiful timber homes
                built without anyone asking what the timber cost the forest.
                You&apos;ve watched neighbours try to bring a tiny home onto
                site only to discover their council won&apos;t certify it.
                You&apos;ve probably done some of this yourself.
              </p>
              <p>
                So when we say we want to build with you — we mean it. Not for
                you. With you. With your community&apos;s site constraints,
                your climate zone, your slope, your bushfire rating, your
                members&apos; actual needs. And with materials that don&apos;t
                betray the values that brought you to community life in the
                first place.{" "}
                <a
                  href="#community-story"
                  className="inline-flex items-center gap-1 text-[#1B4332] hover:text-deep-blue font-semibold border-b border-[#1B4332]/30 hover:border-deep-blue pb-0.5"
                >
                  Tell us about your community <span aria-hidden>→</span>
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ===== WHY HEMP — Inline Rule pattern ===== */}
        <section className="py-16 px-4 bg-white border-t border-b border-black/5">
          <div className="max-w-[1100px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Material
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-10">
              Why hemp, for the ethos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3">
              {WHY_HEMP_TILES.map((item, i) => (
                <div
                  key={item.title}
                  className={
                    i > 0
                      ? "p-6 md:border-l border-t md:border-t-0 border-black/10"
                      : "p-6"
                  }
                >
                  <p
                    className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase mb-2"
                    style={{ color: ACCENT }}
                  >
                    {item.eyebrow}
                  </p>
                  <h3 className="font-playfair text-xl text-deep-blue font-black mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate font-archivo leading-relaxed text-sm">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="max-w-[900px] mx-auto mt-12 text-slate font-archivo leading-relaxed">
              The Joey60 hemp edition is in active development. We are working
              with our materials partner and our engineering partner toward the
              residential certification pathway — the same standard a
              conventional home meets — but we&apos;ll publish the testing
              milestones as they happen rather than claim what hasn&apos;t yet
              been proven. Follow the journey timeline below to see exactly
              where we are.
            </p>

            {/* Real hemp panel material — workshop photo */}
            <figure className="max-w-[1100px] mx-auto mt-12">
              <div className="border border-black/10 bg-warm-grey/40 p-2">
                <Image
                  src="/hemp-homes/hemp-panel-workshop.jpg"
                  alt="Hemp panel sheets in an Australian workshop — engineered hemp panel material under development for the Joey60 Hemp Edition, with a panel-cutting station in the foreground"
                  width={1600}
                  height={1200}
                  className="w-full h-auto"
                />
              </div>
              <figcaption className="mt-3 font-archivo text-sm text-slate/70 leading-relaxed max-w-[800px] mx-auto text-center">
                Engineered hemp panels in our materials partner&apos;s workshop.
                Dense, smooth one side, fibrous the other. The panel-cutting
                station in the foreground sizes sheets for prototype panel runs.
                Real material, not a render.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ===== BUILD MODEL — prominent dedicated section ===== */}
        <section className="py-20 px-4 bg-deep-blue text-off-white">
          <div className="max-w-[1100px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: "#5EAA8B" }}
            >
              Two ways to build
            </p>
            <h2 className="font-playfair text-[2.4rem] md:text-[2.8rem] font-black text-off-white leading-tight mb-4">
              Built by you, or built for you.
            </h2>
            <p className="text-off-white/70 font-archivo leading-relaxed mb-6 max-w-[750px]">
              The Joey60 Hemp Edition is designed for two delivery models from
              the ground up. Same panel system, same certification pathway,
              same hemp-built home — the difference is who picks up the tools.
              Pick whichever fits your community.
            </p>
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.3em] uppercase mb-12 max-w-[750px]"
              style={{ color: "#5EAA8B" }}
            >
              Both models ship the same flat-pack hemp panel kit · Assembled on
              site, not delivered as a 3D modular box
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-off-white/10">
              {/* Owner-builder model */}
              <div className="bg-deep-blue p-8 md:p-10">
                <p
                  className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase mb-3"
                  style={{ color: "#5EAA8B" }}
                >
                  Model 01
                </p>
                <h3 className="font-playfair text-2xl md:text-3xl font-black text-off-white leading-tight mb-4">
                  Built by you,<br />with your community
                </h3>
                <p className="text-off-white/70 font-archivo leading-relaxed mb-6">
                  F2K supplies the Hemp Edition kit, the panel system, the
                  assembly schedule and site supervision. Your community puts
                  it together on site — designed for non-specialist trades, a
                  long weekend with neighbours, and the supervision F2K
                  provides.
                </p>
                <p className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-off-white/40 mb-2">
                  Right for you if
                </p>
                <ul className="space-y-2 text-off-white/70 font-archivo text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>You want the community to own the build, literally.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>You value the lower cost of community labour.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>You have members willing to put a long weekend in.</span>
                  </li>
                </ul>
              </div>

              {/* Built-for-you model */}
              <div className="bg-deep-blue p-8 md:p-10">
                <p
                  className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase mb-3"
                  style={{ color: "#5EAA8B" }}
                >
                  Model 02
                </p>
                <h3 className="font-playfair text-2xl md:text-3xl font-black text-off-white leading-tight mb-4">
                  Built for you,<br />by an F2K team
                </h3>
                <p className="text-off-white/70 font-archivo leading-relaxed mb-6">
                  Same flat-pack hemp panel kit lands on your site. The
                  difference is the build team — F2K supplies people end-to-end:
                  site prep, on-site panel assembly, fit-out, handover. You
                  move in. The community doesn&apos;t pick up the tools unless
                  they want to.
                </p>
                <p className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-off-white/40 mb-2">
                  Right for you if
                </p>
                <ul className="space-y-2 text-off-white/70 font-archivo text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>You want a turn-key build — ready to live in.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>Your community doesn&apos;t have the time or trade mix on site.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden style={{ color: "#5EAA8B" }}>›</span>
                    <span>You want the F2K warranty and delivery timeline.</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-off-white/50 font-archivo text-sm leading-relaxed mt-10 max-w-[750px]">
              Not sure yet? That&apos;s fine. Tell us on the waitlist form and
              we&apos;ll send you updates on both as the program progresses.
            </p>
          </div>
        </section>

        {/* ===== BACKSTORY ===== */}
        <section className="py-16 px-4 bg-warm-grey">
          <div className="max-w-[900px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Backstory
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-8">
              How we got here — and who&apos;s building this with us
            </h2>
            <div className="space-y-5 text-slate font-archivo leading-relaxed">
              <p>
                <strong className="font-archivo font-bold text-deep-blue">
                  Factory2Key
                </strong>{" "}
                brings the design. We&apos;ve spent years building modular and
                flatpack capability in Australia, delivering homes that get out
                of the factory and onto site in weeks, not years. The Joey60 is
                our 60m² single-storey design — and we&apos;ve been waiting for
                the right material to build it in.
              </p>
              <p>
                <strong className="font-archivo font-bold text-deep-blue">
                  Our materials partner
                </strong>{" "}
                is developing an engineered hemp panel system — intended as a
                genuine replacement for conventional sheet and framing timber.
                The work is happening in Australia. As the panels reach test
                milestones we&apos;ll publish the results on the journey timeline
                below.
              </p>
              <p>
                <strong className="font-archivo font-bold text-deep-blue">
                  Our engineering partner
                </strong>{" "}
                is leading the structural side — load testing, panel connection
                design, and the assembly geometry that lets a community put the
                home together on site without specialist trades. We&apos;ll
                name our partners on this page once their work is in market and
                they&apos;ve agreed to be named publicly.
              </p>
              <p>
                Three teams, one shared goal: a community-assembled, hemp-built
                60m² dwelling — the{" "}
                <strong className="font-archivo font-bold text-deep-blue">
                  Joey60 Hemp Edition
                </strong>{" "}
                — built openly so the people who&apos;ll live in these homes
                know exactly how they got here.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PRINCIPLES — Numbered List pattern ===== */}
        <section className="py-16 px-4 bg-white border-t border-b border-black/5">
          <div className="max-w-[900px] mx-auto">
            <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-ember mb-4">
              Principles
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-10">
              Built on four principles
            </h2>

            <ol className="space-y-6">
              {PRINCIPLES.map((p, i) => (
                <li
                  key={p.title}
                  className="grid grid-cols-[auto_1fr] gap-5 items-start"
                >
                  <span className="font-ibm-mono text-[0.65rem] tracking-[0.3em] uppercase text-ember pt-1 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-archivo font-bold text-deep-blue mb-1">
                      {p.title}
                    </h3>
                    <p className="text-slate font-archivo leading-relaxed text-sm">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===== JOURNEY TIMELINE ===== */}
        <section id="journey" className="py-16 px-4 bg-off-white">
          <div className="max-w-[1100px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Build in public
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-3">
              The journey so far — and what&apos;s coming
            </h2>
            <p className="text-slate font-archivo leading-relaxed mb-10 max-w-[800px]">
              From concept through engineering, prototyping and certification,
              to first install. We&apos;re publishing every milestone as it
              happens — so when the first home lands, you&apos;ll know exactly
              how it got there.
            </p>

            <Suspense
              fallback={
                <div className="min-h-[480px] animate-pulse bg-warm-grey/30" />
              }
            >
              <JourneyTimeline />
            </Suspense>
          </div>
        </section>

        {/* ===== COMMUNITIES PIPELINE ===== */}
        <section className="py-16 px-4 bg-warm-grey">
          <div className="max-w-[900px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Pipeline
            </p>
            <h2 className="font-playfair text-[1.5rem] font-black text-deep-blue leading-tight mb-4">
              Communities in the program
            </h2>
            <p className="text-slate font-archivo leading-relaxed">
              We&apos;re in conversation with eco-communities along
              Australia&apos;s eastern seaboard about being the first to host a
              Joey60 hemp edition. We&apos;ll name each community publicly only
              once they&apos;ve given us permission to do so. If your community
              isn&apos;t yet on the list — tell us about it.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {COMMUNITIES_PIPELINE.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center px-2.5 py-1 font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-slate/70 bg-white border border-black/10"
                >
                  Wave {c.wave} · {c.regionDescriptor}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <a
                href="#community-story"
                className="inline-flex items-center gap-2 text-[#1B4332] hover:text-deep-blue font-archivo border-b border-[#1B4332]/30 hover:border-deep-blue pb-0.5"
              >
                Tell us about your community <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ===== COMMUNITY STORY CTA + site plan invitation ===== */}
        <section id="community-story" className="py-20 px-4 bg-off-white">
          <div className="max-w-[800px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Let&apos;s talk now — not after the build is ready
            </p>
            <h2 className="font-playfair text-[2.2rem] font-black text-deep-blue leading-tight mb-6">
              Tell us about your community.<br />Send us a plan if you have one.
            </h2>
            <p className="text-slate font-archivo leading-relaxed mb-8 text-lg">
              We don&apos;t want you to wait for us to finish building the home
              before we start talking. Site-level planning runs on its own
              clock — and we can be working through it with your community in
              parallel.
            </p>

            <div className="bg-white border border-black/5 p-8 md:p-10">
              <p className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-ember mb-3">
                Send us
              </p>
              <ul className="space-y-3 text-slate font-archivo leading-relaxed mb-6">
                <li className="flex gap-3">
                  <span aria-hidden style={{ color: ACCENT }}>›</span>
                  <span>
                    A <strong className="text-deep-blue">plan of your community</strong>{" "}
                    — even a rough sketch. Show us where new dwellings could
                    sit, what&apos;s already there, where the road and services
                    run.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden style={{ color: ACCENT }}>›</span>
                  <span>
                    A note about{" "}
                    <strong className="text-deep-blue">your members</strong> —
                    who needs the housing, how many homes you could see, what
                    the council and planning context looks like.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden style={{ color: ACCENT }}>›</span>
                  <span>
                    Anything else you want us to understand about your{" "}
                    <strong className="text-deep-blue">site or values</strong>.
                  </span>
                </li>
              </ul>
              <p className="text-slate font-archivo leading-relaxed mb-6">
                As the Joey60 Hemp Edition moves through development,
                engineering and prototyping, your community can be moving
                through site planning, council conversations, and member
                allocation in parallel. By the time the home is ready, your
                community is ready too.
              </p>
              <p className="text-slate font-archivo leading-relaxed">
                Email us at{" "}
                <a
                  href="mailto:dennis@factory2key.com.au"
                  className="text-[#1B4332] font-semibold border-b border-[#1B4332]/30 hover:border-[#1B4332] pb-0.5"
                >
                  dennis@factory2key.com.au
                </a>{" "}
                — attach what you have, even if it&apos;s rough. We&apos;ll
                reply personally and start the conversation. The full community
                submission form opens in our next release.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FAQ — objection handling before the waitlist ===== */}
        <section id="faq" className="py-20 px-4 bg-warm-grey">
          <div className="max-w-[900px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Common questions
            </p>
            <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-12">
              What you&apos;re probably wondering
            </h2>

            <div className="space-y-10">
              {[
                {
                  q: "How much will it cost?",
                  a: (
                    <>
                      <p>
                        Honest answer: we&apos;ll publish firm pricing as soon as
                        we lock it in during the engineering and certification
                        process. Pricing depends on too many real variables to
                        promise a number we&apos;d have to walk back.
                      </p>
                      <p>
                        Working estimate today:{" "}
                        <strong className="text-deep-blue">
                          around $2,500 to $3,500 per square metre
                        </strong>{" "}
                        of internal floor area, depending on accessorising,
                        finish level, your specific requirements, plus location
                        factors (transport, bushfire rating, slope, off-grid
                        services). For the 60m² Joey60 Hemp Edition that&apos;s
                        a rough envelope of{" "}
                        <strong className="text-deep-blue">
                          $150,000 to $210,000
                        </strong>{" "}
                        per dwelling. Land, site works and connections are
                        separate.
                      </p>
                      <p>
                        These numbers are indicative and will be refined and
                        published as we go. Join the waitlist below to be
                        notified the moment firm pricing lands.
                      </p>
                    </>
                  ),
                },
                {
                  q: "When can I actually get one?",
                  a: (
                    <>
                      <p>
                        The Joey60 Hemp Edition is in active development. We
                        are working through panel material development,
                        engineering and load testing, prototype assembly, and
                        the residential certification pathway. The journey
                        timeline above shows exactly where we are.
                      </p>
                      <p>
                        We&apos;ll publish a delivery window for the first
                        install once the prototype is built and tested. Join
                        the waitlist and you&apos;ll know first.
                      </p>
                    </>
                  ),
                },
                {
                  q: "Is it certified to live in?",
                  a: (
                    <>
                      <p>
                        Not yet — and we&apos;re being deliberate about not
                        claiming otherwise. We&apos;re building the Joey60 Hemp
                        Edition toward the residential certification pathway
                        under the National Construction Code, the same standard
                        a conventional home meets.
                      </p>
                      <p>
                        Test methodology and results will be published on the
                        journey timeline as they happen. No certification
                        claims will appear here until they&apos;re true.
                      </p>
                    </>
                  ),
                },
                {
                  q: "Do I have to live in an eco-community?",
                  a: (
                    <p>
                      No. The program is designed for eco-communities first
                      because the values alignment is tightest there, but if
                      you&apos;re aligned with the ethos and you have land or
                      a community in mind, register your interest. We&apos;d
                      rather hear from you and have the conversation than not.
                    </p>
                  ),
                },
                {
                  q: "What if my community doesn't have construction trade skills?",
                  a: (
                    <p>
                      That&apos;s exactly why both build models exist. The
                      owner-builder model is designed to be assembled by
                      community members with F2K supervision — no specialist
                      trades required. If even that isn&apos;t feasible,
                      pick the built-for-you model and an F2K team supplies
                      the build end-to-end.
                    </p>
                  ),
                },
                {
                  q: "What's actually in the kit? And how does it arrive on site?",
                  a: (
                    <>
                      <p>
                        The Hemp Edition is a flat-pack panel kit, not a 3D
                        modular box. The kit ships flat on a truck and is
                        assembled on site. Both build models use the same kit
                        — the difference is who picks up the tools.
                      </p>
                      <p>
                        Kit contents: the hemp panel system (walls, floor,
                        roof skin), engineered connection hardware, fasteners,
                        an assembly schedule, and the supervision F2K provides
                        on site. Foundations, site connections (power, water,
                        waste) and any owner-supplied finishes are
                        site-specific and quoted separately.
                      </p>
                      <p>
                        Final kit contents and panel sizes will be confirmed
                        during prototyping and published before the first
                        install.
                      </p>
                    </>
                  ),
                },
                {
                  q: "Should our community wait until the home is built before talking to you?",
                  a: (
                    <>
                      <p>
                        No — please don&apos;t. Site-level planning runs on
                        its own clock. Council conversations, working out
                        where new dwellings could sit on your land, lining up
                        which members want which homes — all of that takes
                        months and is independent of where we are in the home
                        build.
                      </p>
                      <p>
                        Send us a plan of your community (even a rough sketch),
                        a note on what you&apos;re thinking, and we can be
                        working through the site-level conversation in parallel
                        with our development and testing process. By the time
                        the home is ready, your community is ready too.
                      </p>
                    </>
                  ),
                },
                {
                  q: "Is there a deposit or commitment?",
                  a: (
                    <p>
                      No. The waitlist is registration of interest only — no
                      deposit, no contract, no obligation. You can unsubscribe
                      at any time. We&apos;ll only reach out when there&apos;s
                      a real milestone or a real decision in front of you.
                    </p>
                  ),
                },
              ].map((item, i) => (
                <article key={item.q}>
                  <p className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-ember mb-2 tabular-nums">
                    Q{String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-playfair text-[1.4rem] md:text-[1.6rem] font-black text-deep-blue leading-tight mb-4">
                    {item.q}
                  </h3>
                  <div className="space-y-3 text-slate font-archivo leading-relaxed">
                    {item.a}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WAITLIST ===== */}
        <section id="waitlist" className="py-20 px-4 bg-off-white border-t border-black/5">
          <div className="max-w-[800px] mx-auto">
            <p
              className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase mb-4"
              style={{ color: ACCENT }}
            >
              Join the waitlist
            </p>
            <h2 className="font-playfair text-[2.4rem] font-black text-deep-blue leading-tight mb-4">
              Walk the journey with us
            </h2>
            <p className="text-slate font-archivo leading-relaxed mb-10">
              Join the waitlist. We&apos;ll send you each major milestone —
              concept design, panel mockups, engineering tests, prototype
              builds, certification, the first install — as it happens. No
              deposit, no commitment, unsubscribe any time.
            </p>
            <HempHomesWaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
