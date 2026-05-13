import { Metadata } from "next";
import HeroSitePlan from "@/components/seafields/HeroSitePlan";
import RegistrationForm from "@/components/seafields/RegistrationForm";

export const metadata: Metadata = {
  title: "Seafields Estate — Register Your Interest | F2K",
  description:
    "145-lot residential subdivision in Waggrakine, Geraldton WA. Vacant serviced land or house & land packages. Register your interest — no deposit required.",
};

export default function SeafieldsEstatePage() {
  return (
    <>
      {/* ===== DISCLAIMER BANNER ===== */}
      <div className="bg-[#1A2744] text-white/80 text-xs font-archivo text-center py-2.5 px-4 leading-relaxed">
        <strong className="text-white">REGISTRATION OF INTEREST ONLY</strong> —
        No deposit is required or accepted. Registering does not create any
        legal or financial obligation.
      </div>

      {/* ===== HERO ===== */}
      <section className="relative bg-[#1A2744] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#1A2744] to-[#00B5AD]/20" />

        <div className="relative max-w-[1100px] mx-auto px-4 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
                A Factory2Key Development
              </p>
              <h1 className="font-playfair text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.1] mb-6">
                Seafields Estate
              </h1>
              <p className="text-xl text-white/70 font-archivo leading-relaxed mb-2">
                145 residential lots — vacant land or house &amp; land packages.
              </p>
              <p className="text-lg text-white/50 font-archivo mb-8">
                Waggrakine, Geraldton WA — 8km from Geraldton CBD
              </p>
              <p className="text-white/60 font-archivo leading-relaxed mb-8 max-w-lg">
                Select your preferred lot on the subdivision plan — no deposit,
                no commitment. Available as vacant serviced land or as a
                complete house &amp; land package with Factory2Key modular
                construction. We&apos;ll keep you informed as the project
                progresses.
              </p>
              <a
                href="#site-map"
                className="inline-block bg-[#00B5AD] hover:bg-[#009E97] text-white px-8 py-3.5 font-archivo font-semibold transition-colors"
              >
                Select your lot &rarr;
              </a>
            </div>

            {/* Hero plan — vector SVG rendered from CLE 08B DWG polygons */}
            <div>
              <div className="border border-white/10 bg-white/5 p-3">
                <HeroSitePlan />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase text-white/50 self-center mr-1">
                  Stages:
                </span>
                {[
                  { label: "1", color: "#B7D5EC", border: "#5694C3" },
                  { label: "2", color: "#F5E7D6", border: "#C7A877" },
                  { label: "3", color: "#F4B0A6", border: "#D06A5B" },
                  { label: "4", color: "#F7E877", border: "#BFA024" },
                  { label: "5", color: "#B8D99B", border: "#6B9B4A" },
                  { label: "6", color: "#C9B2D5", border: "#8A6AA7" },
                  { label: "7", color: "#D6D6D6", border: "#9A9A9A" },
                ].map((s) => (
                  <span
                    key={s.label}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.65rem] font-archivo font-semibold text-deep-blue border"
                    style={{
                      backgroundColor: s.color,
                      borderColor: s.border,
                    }}
                  >
                    Stage {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KEY STATS ===== */}
      <section className="bg-white border-b border-black/5">
        <div className="max-w-[1100px] mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { value: "145", label: "Lots" },
              { value: "445–1522m²", label: "Lot sizes" },
              { value: "POA", label: "Land pricing" },
              { value: "Various", label: "H&L packages" },
              { value: "From Q3 2026", label: "Stage 1 release" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-playfair text-2xl md:text-3xl font-black text-deep-blue">
                  {stat.value}
                </div>
                <div className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-slate/60 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT THE PROJECT ===== */}
      <section className="py-16 px-4 bg-off-white">
        <div className="max-w-[900px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            About the Development
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-6">
            Land &amp; Lifestyle in Geraldton&apos;s Growth Corridor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-slate font-archivo leading-relaxed space-y-4">
              <p>
                Seafields Estate is a 145-lot residential subdivision in
                Waggrakine, approximately 8km north of Geraldton CBD. The estate
                is part of a larger ~300-lot development, with over 155 lots
                already sold since 2012.
              </p>
              <p>
                All lots are flat and require minimal earthworks. Reticulated
                water, sewer, and power will be connected as part of subdivision
                works prior to titling, expected around September 2026. Lots
                will be available as vacant serviced land (titled, ready to
                build) or as complete house &amp; land packages with Factory2Key
                modular construction.
              </p>
              <p>
                The $188M Geraldton Health Campus redevelopment, alongside other
                governmental, corporate, and private demand drivers, is driving
                significant demand for housing in the area. Strong early uptake
                has already been signalled — register your interest now to
                avoid disappointment.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Developer", value: "Factory2Key Pty Ltd" },
                { label: "Location", value: "Pepper Gate, Waggrakine WA 6530" },
                { label: "Zoning", value: "R20 Residential" },
                { label: "Lots", value: "145 residential (staged release)" },
                { label: "Lot Sizes", value: "445m² – 1,522m² (avg 610m²)" },
                { label: "Land Area", value: "8.84 hectares saleable" },
                { label: "Terrain", value: "Flat — minimal earthworks" },
                { label: "Services", value: "Water, sewer, power (reticulated)" },
                { label: "Planner", value: "CLE Town Planning + Design" },
                { label: "Plan Reference", value: "CLE 3027-08B-01 (22 Apr 2026, WAPC 202888)" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex border-b border-black/5 pb-2"
                >
                  <span className="font-ibm-mono text-[0.65rem] tracking-wider uppercase text-slate/50 w-28 shrink-0 pt-0.5">
                    {item.label}
                  </span>
                  <span className="font-archivo text-sm text-deep-blue">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STAGING ===== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-[900px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            Development Staging
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-3">
            Tranche 1 Release — 81 of 143 Lots
          </h2>
          <p className="text-slate font-archivo leading-relaxed mb-8 max-w-[700px]">
            The initial Tranche 1 release covers Stages 1–3 plus three
            lots fronting Sutcliffe Road — a total of 81 lots. The remaining
            62 lots will release in subsequent stages as infrastructure works
            progress.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                stage: "Stage 1",
                lots: "43+3",
                area: "SW Block",
                timeline: "From Q3 2026",
              },
              {
                stage: "Stage 2",
                lots: "14",
                area: "Pepper Gate Central",
                timeline: "From Q4 2026",
              },
              {
                stage: "Stage 3",
                lots: "23",
                area: "Central",
                timeline: "From Q1 2027",
              },
              {
                stage: "Sutcliffe Rd",
                lots: "3",
                area: "Lots 236–238",
                timeline: "From Q3 2026",
              },
            ].map((t) => (
              <div
                key={t.stage}
                className="bg-off-white p-4 border border-black/5 text-center"
              >
                <div className="font-playfair text-base font-black text-deep-blue">
                  {t.stage}
                </div>
                <div className="font-archivo text-2xl font-bold text-[#00B5AD] mt-1">
                  {t.lots}
                </div>
                <div className="font-ibm-mono text-[0.55rem] tracking-wider text-slate/60 mt-1">
                  LOTS
                </div>
                <div className="font-archivo text-[0.7rem] text-slate/80 mt-2 leading-tight">
                  {t.area}
                </div>
                <div className="font-archivo text-xs text-slate mt-1">
                  {t.timeline}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-off-white border border-black/5 p-4 text-center">
            <div className="font-ibm-mono text-[0.6rem] tracking-[0.3em] uppercase text-slate/60 mb-1">
              Future Tranches
            </div>
            <div className="font-archivo text-sm text-deep-blue">
              <strong>62 further lots</strong> &middot; Stages 4–7
              (Pepper Gate Inner, Central Upper, Collins Road) &middot; release
              schedule to be advised
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOT CATEGORIES ===== */}
      <section className="py-16 px-4 bg-warm-grey">
        <div className="max-w-[900px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            Purchase Options
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-8">
            Two Ways to Buy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Vacant Serviced Land",
                desc: "Titled, serviced lots ready to build. Bring your own builder or hold as an investment. Priced from $150,000.",
              },
              {
                title: "House & Land Package",
                desc: "Complete turnkey modular home by Factory2Key. Lot + 2, 3 and 4-bedroom modular build + site works will be available from $485,000.",
              },
            ].map((opt) => (
              <div
                key={opt.title}
                className="bg-white p-6 border border-black/5"
              >
                <h3 className="font-playfair text-lg font-black text-deep-blue mb-2">
                  {opt.title}
                </h3>
                <p className="font-archivo text-sm text-slate leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MARKET CONTEXT ===== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-[900px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-[#00B5AD] mb-4">
            Geraldton Market
          </p>
          <h2 className="font-playfair text-[2rem] font-black text-deep-blue leading-tight mb-6">
            Strong Growth Fundamentals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: "$533K", label: "Median house price", sub: "Waggrakine" },
              { value: "27%", label: "Annual growth", sub: "Year-on-year" },
              { value: "<1%", label: "Rental vacancy", sub: "Geraldton region" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-playfair text-2xl md:text-3xl font-black text-[#00B5AD]">
                  {stat.value}
                </div>
                <div className="font-archivo text-sm text-deep-blue font-semibold mt-1">
                  {stat.label}
                </div>
                <div className="font-ibm-mono text-[0.55rem] text-slate/50 uppercase mt-0.5">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INTERACTIVE MAP + REGISTRATION FORM ===== */}
      <section className="py-20 px-4 bg-off-white">
        <div className="max-w-[1200px] mx-auto">
          <RegistrationForm />
        </div>
      </section>

      {/* ===== PRIVACY NOTE ===== */}
      <section className="py-8 px-4 bg-[#1A2744]">
        <div className="max-w-[900px] mx-auto">
          <p className="text-white/40 text-xs font-archivo leading-relaxed text-center">
            Registration data collected on this page is used by Factory2Key Pty
            Ltd for project communications only and is not shared with any third
            party for marketing. Any registration of interest shall not be
            construed as a promise to buy or sell.{" "}
            <a
              href="/privacy"
              className="text-[#00B5AD]/60 hover:text-[#00B5AD] underline transition-colors"
            >
              View our Privacy Policy
            </a>
          </p>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section className="py-10 px-4 bg-warm-grey">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="font-archivo text-sm text-slate mb-3">
            Questions about Seafields Estate?
          </p>
          <p className="font-archivo text-deep-blue font-semibold mb-1.5">
            Uwe Jacobs —{" "}
            <a
              href="mailto:uwe@factory2key.com.au"
              className="text-[#00B5AD] hover:underline"
            >
              uwe@factory2key.com.au
            </a>{" "}
            &middot;{" "}
            <a
              href="tel:+61400417043"
              className="text-[#00B5AD] hover:underline"
            >
              +61 400 417 043
            </a>
          </p>
          <p className="font-archivo text-deep-blue font-semibold">
            Dennis McMahon —{" "}
            <a
              href="mailto:dennis@factory2key.com.au"
              className="text-[#00B5AD] hover:underline"
            >
              dennis@factory2key.com.au
            </a>{" "}
            &middot;{" "}
            <a
              href="tel:+61402612471"
              className="text-[#00B5AD] hover:underline"
            >
              +61 402 612 471
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
