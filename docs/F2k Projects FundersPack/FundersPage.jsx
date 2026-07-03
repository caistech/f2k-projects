import React, { useState, useMemo } from "react";

/**
 * F2K — Funders page
 * Drop into f2k-projects (e.g. app/funders/page.jsx). Self-contained: no Tailwind,
 * no external libs. All styling is in the scoped <style> block + inline styles.
 */

const INK = "#14181F";
const PAPER = "#EEF1F4";
const NAVY = "#1B3A5B";
const NAVY_DK = "#142C44";
const TIMBER = "#C77F3A";
const GREEN = "#2E7D5B";
const LINE = "#D5DBE0";
const MUTED = "#5C6773";

const HURDLE = 0.20; // development-margin hurdle for the verdict

const fmt0 = (n) =>
  "$" + Math.round(n).toLocaleString("en-AU");
const fmtM = (n) =>
  "$" + (n / 1e6).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
const pct = (n) => (n * 100).toLocaleString("en-AU", { maximumFractionDigits: 1 }) + "%";

// Branscombe cost categories share of TDC (ex-finance) — used for the generic stack proportions
const COST_CATS = [
  { key: "land", label: "Land", share: 2500000 },
  { key: "site", label: "Site works", share: 3500000 },
  { key: "modules", label: "Modules", share: 7314000 },
  { key: "sea", label: "Shipping — sea", share: 1800000 },
  { key: "landship", label: "Shipping — land", share: 196500 },
  { key: "install", label: "Install & complexing", share: 666000 },
  { key: "builder", label: "Builder & warranty", share: 185000 },
  { key: "finish", label: "Finishing", share: 919968 },
  { key: "fees", label: "Fees", share: 653538 },
];
const COST_BASE = COST_CATS.reduce((s, c) => s + c.share, 0); // 17,735,006

// timber→navy ramp so the stack reads as one material building up
const STACK_COLORS = [
  "#C77F3A", "#B6783E", "#9E6E45", "#7E6650", "#5A5E5E",
  "#3F5165", "#2E4A6A", "#234468", "#1B3A5B",
];

function StackColumn({ revenue, categories, total, height = 320, showHurdle = true, animate = true }) {
  // categories fill from the bottom; margin headroom is revenue - total
  const surplus = Math.max(revenue - total, 0);
  const over = total > revenue;
  const denom = Math.max(revenue, total);
  const px = (v) => (v / denom) * height;

  return (
    <div className="f2k-stackwrap">
      <div className="f2k-stackcol" style={{ height }}>
        {/* revenue reference line */}
        <div className="f2k-revline" style={{ bottom: px(revenue) }}>
          <span>Revenue · {fmtM(revenue)}</span>
        </div>
        {/* hurdle marker */}
        {showHurdle && (
          <div className="f2k-hurdle" style={{ bottom: px(total + revenue * 0) + 0, display: "none" }} />
        )}
        {/* cost blocks */}
        <div className="f2k-blocks">
          {categories.map((c, i) => {
            const v = c.value;
            const h = px(v);
            return (
              <div
                key={c.key}
                className={"f2k-block" + (animate ? " grow" : "")}
                style={{
                  height: h,
                  background: STACK_COLORS[i % STACK_COLORS.length],
                  animationDelay: `${i * 70}ms`,
                }}
                title={`${c.label} · ${fmt0(v)}`}
              >
                {h > 18 && (
                  <span className="f2k-blocklabel">
                    {c.label}
                    <em>{fmtM(v)}</em>
                  </span>
                )}
              </div>
            );
          })}
          {/* margin headroom */}
          {!over && (
            <div
              className={"f2k-margin" + (animate ? " grow" : "")}
              style={{ height: px(surplus), animationDelay: `${categories.length * 70}ms` }}
            >
              {px(surplus) > 22 && (
                <span className="f2k-marginlabel">
                  Margin
                  <em>{fmtM(surplus)}</em>
                </span>
              )}
            </div>
          )}
          {over && (
            <div className="f2k-overflow" style={{ height: 6 }} />
          )}
        </div>
      </div>
      <div className="f2k-axis">
        <span>Cost stack → margin headroom</span>
      </div>
    </div>
  );
}

function Verdict({ margin }) {
  let label, color, bg;
  if (margin >= HURDLE) { label = "Fundable"; color = "#0f4a32"; bg = "#D8EEE2"; }
  else if (margin >= 0.15) { label = "Marginal"; color = "#7a5a16"; bg = "#F4E8CC"; }
  else { label = "Below hurdle"; color = "#7a2420"; bg = "#F3D9D6"; }
  return (
    <span className="f2k-verdict" style={{ color, background: bg }}>
      <span className="f2k-dot" style={{ background: color }} /> {label}
    </span>
  );
}

export default function FundersPage() {
  const [units, setUnits] = useState(37);
  const [price, setPrice] = useState(685000);
  const [costUnit, setCostUnit] = useState(Math.round(COST_BASE / 37)); // 479,324

  const model = useMemo(() => {
    const revenue = units * price;
    const totalCost = units * costUnit;
    const surplus = revenue - totalCost;
    const margin = revenue > 0 ? surplus / revenue : 0;
    const cats = COST_CATS.map((c) => ({
      key: c.key,
      label: c.label,
      value: (c.share / COST_BASE) * totalCost,
    }));
    return { revenue, totalCost, surplus, margin, cats };
  }, [units, price, costUnit]);

  // Branscombe — real, indicative
  const bransRevenue = 37 * 685000;
  const bransCats = COST_CATS.map((c, i) => ({ key: c.key, label: c.label, value: c.share }));

  return (
    <div className="f2k-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .f2k-root{ --ink:${INK}; --navy:${NAVY}; --timber:${TIMBER}; --green:${GREEN};
          background:${PAPER}; color:${INK}; font-family:'Inter',system-ui,sans-serif;
          line-height:1.5; -webkit-font-smoothing:antialiased; min-height:100%;
          background-image:linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px);
          background-size:48px 48px; background-position:-1px -1px; }
        .f2k-root *{ box-sizing:border-box; }
        .f2k-wrap{ max-width:1080px; margin:0 auto; padding:0 24px; }
        .f2k-mono{ font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; }
        .f2k-eyebrow{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.22em;
          text-transform:uppercase; color:${TIMBER}; font-weight:600; }
        .f2k-h1{ font-family:'Archivo',sans-serif; font-weight:800; letter-spacing:-.02em;
          font-size:clamp(40px,7vw,76px); line-height:.98; margin:14px 0 0; color:${INK}; }
        .f2k-h2{ font-family:'Archivo',sans-serif; font-weight:700; letter-spacing:-.01em;
          font-size:clamp(24px,3.4vw,34px); margin:0; color:${INK}; }
        .f2k-lead{ font-size:clamp(16px,2vw,19px); color:${MUTED}; max-width:54ch; margin:20px 0 0; }

        .f2k-topbar{ border-bottom:1px solid ${LINE}; background:rgba(238,241,244,.82);
          backdrop-filter:blur(6px); position:sticky; top:0; z-index:20; }
        .f2k-topbar .f2k-wrap{ display:flex; align-items:center; justify-content:space-between; height:60px; }
        .f2k-brand{ font-family:'Archivo',sans-serif; font-weight:800; letter-spacing:-.01em; font-size:18px; }
        .f2k-brand b{ color:${TIMBER}; }
        .f2k-live{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:${MUTED}; display:flex; gap:8px; align-items:center; }
        .f2k-livedot{ width:7px;height:7px;border-radius:50%;background:${GREEN}; box-shadow:0 0 0 0 rgba(46,125,91,.5); animation:f2kpulse 2.4s infinite; }
        @keyframes f2kpulse{ 0%{box-shadow:0 0 0 0 rgba(46,125,91,.5)} 70%{box-shadow:0 0 0 7px rgba(46,125,91,0)} 100%{box-shadow:0 0 0 0 rgba(46,125,91,0)} }

        section{ padding:72px 0; border-bottom:1px solid ${LINE}; }
        .f2k-hero{ padding:84px 0 76px; }

        .f2k-steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:36px; }
        .f2k-step{ background:#fff; border:1px solid ${LINE}; border-radius:4px; padding:24px; position:relative; overflow:hidden; }
        .f2k-step::before{ content:attr(data-n); position:absolute; right:14px; top:6px;
          font-family:'Archivo',sans-serif; font-weight:800; font-size:60px; color:${PAPER}; line-height:1; }
        .f2k-step h3{ font-family:'Archivo',sans-serif; font-size:18px; margin:0 0 8px; letter-spacing:-.01em; position:relative; }
        .f2k-step p{ margin:0; font-size:14.5px; color:${MUTED}; position:relative; }
        .f2k-steparrow{ height:2px; background:${TIMBER}; width:34px; margin:14px 0 0; position:relative; }

        .f2k-chain{ display:grid; grid-template-columns:repeat(7,1fr); gap:0; border:1px solid ${LINE};
          border-radius:4px; overflow:hidden; background:#fff; }
        .f2k-node{ padding:18px 14px; border-right:1px solid ${LINE}; position:relative; }
        .f2k-node:last-child{ border-right:0; }
        .f2k-node:first-child{ background:#FBF4E6; }
        .f2k-noden{ font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600; color:${TIMBER}; }
        .f2k-node h4{ font-family:'Archivo',sans-serif; font-size:14px; margin:8px 0 6px; letter-spacing:-.01em; line-height:1.15; }
        .f2k-node p{ font-size:11.5px; color:${MUTED}; margin:0; line-height:1.35; }
        .f2k-chainband{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.04em;
          color:#dfe8f1; background:${NAVY}; border-radius:4px; padding:12px 16px; margin-top:12px; text-align:center; }
        .f2k-formula{ font-family:'IBM Plex Mono',monospace; font-size:clamp(13px,2vw,16px);
          background:${NAVY}; color:#dfe8f1; border-radius:4px; padding:18px 20px; margin-top:8px;
          display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; }
        .f2k-formula b{ color:#fff; } .f2k-formula .op{ color:${TIMBER}; } .f2k-formula .res{ color:#8fe0b6; }

        .f2k-calc{ display:grid; grid-template-columns:1.05fr 1fr; gap:36px; margin-top:30px; align-items:start; }
        .f2k-controls label{ display:block; font-size:12.5px; color:${MUTED}; font-weight:600; margin:0 0 6px;
          font-family:'IBM Plex Mono',monospace; letter-spacing:.04em; text-transform:uppercase; }
        .f2k-ctl{ margin-bottom:22px; }
        .f2k-ctl .val{ font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:20px; color:${INK}; }
        input[type=range]{ -webkit-appearance:none; width:100%; height:3px; background:${LINE}; border-radius:2px; margin-top:12px; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px;height:18px;border-radius:50%;
          background:${NAVY}; cursor:pointer; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.25); }
        input[type=range]::-moz-range-thumb{ width:18px;height:18px;border-radius:50%; background:${NAVY}; cursor:pointer; border:3px solid #fff; }

        .f2k-readout{ background:#fff; border:1px solid ${LINE}; border-radius:4px; padding:22px; }
        .f2k-rrow{ display:flex; justify-content:space-between; align-items:baseline; padding:9px 0; border-bottom:1px dashed ${LINE}; }
        .f2k-rrow:last-child{ border-bottom:0; }
        .f2k-rrow .k{ font-size:13.5px; color:${MUTED}; }
        .f2k-rrow .v{ font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:16px; }
        .f2k-bigmargin{ font-family:'Archivo',sans-serif; font-weight:800; font-size:46px; letter-spacing:-.02em; line-height:1; }

        .f2k-verdict{ display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono',monospace;
          font-weight:600; font-size:13px; padding:6px 12px; border-radius:999px; }
        .f2k-dot{ width:8px;height:8px;border-radius:50%; }

        /* stack visual */
        .f2k-stackwrap{ }
        .f2k-stackcol{ position:relative; border-left:2px solid ${INK}; border-bottom:2px solid ${INK};
          padding-left:0; }
        .f2k-blocks{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column-reverse; }
        .f2k-block{ width:100%; border-top:1px solid rgba(255,255,255,.35); display:flex; align-items:center;
          padding:0 12px; overflow:hidden; }
        .f2k-blocklabel{ color:#fff; font-size:11.5px; font-weight:600; display:flex; gap:8px; align-items:baseline;
          white-space:nowrap; text-shadow:0 1px 1px rgba(0,0,0,.18); }
        .f2k-blocklabel em{ font-family:'IBM Plex Mono',monospace; font-style:normal; opacity:.85; font-size:11px; }
        .f2k-margin{ width:100%; background:repeating-linear-gradient(45deg,#D8EEE2,#D8EEE2 7px,#cfe9da 7px,#cfe9da 14px);
          border-top:2px solid ${GREEN}; display:flex; align-items:center; padding:0 12px; }
        .f2k-marginlabel{ color:#0f4a32; font-size:12px; font-weight:700; display:flex; gap:8px; align-items:baseline; }
        .f2k-marginlabel em{ font-family:'IBM Plex Mono',monospace; font-style:normal; }
        .f2k-overflow{ width:100%; background:#c0413a; }
        .f2k-revline{ position:absolute; left:-2px; right:0; border-top:1px dashed ${MUTED}; }
        .f2k-revline span{ position:absolute; right:0; top:-20px; font-family:'IBM Plex Mono',monospace;
          font-size:11px; color:${MUTED}; background:${PAPER}; padding:0 6px; }
        .f2k-axis{ margin-top:8px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em;
          text-transform:uppercase; color:${MUTED}; }
        .grow{ transform-origin:bottom; animation:f2kgrow .5s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes f2kgrow{ from{ transform:scaleY(0); opacity:.3 } to{ transform:scaleY(1); opacity:1 } }

        /* projects */
        .f2k-caveat{ display:flex; gap:14px; align-items:flex-start; background:#FBF4E6; border:1px solid #E7D6B0;
          border-left:4px solid ${TIMBER}; border-radius:4px; padding:16px 18px; margin-bottom:28px; }
        .f2k-caveat .t{ font-size:14px; color:#5b4a2a; }
        .f2k-caveat b{ color:#3f3417; }
        .f2k-projects{ display:grid; grid-template-columns:1fr 1fr; gap:22px; }
        .f2k-card{ background:#fff; border:1px solid ${LINE}; border-radius:4px; padding:24px; }
        .f2k-cardhead{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
        .f2k-cardhead h3{ font-family:'Archivo',sans-serif; font-size:22px; margin:0; letter-spacing:-.01em; }
        .f2k-cardhead .sub{ font-size:13px; color:${MUTED}; margin-top:2px; }
        .f2k-badge{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; font-weight:600; letter-spacing:.06em;
          text-transform:uppercase; padding:5px 9px; border-radius:3px; white-space:nowrap; }
        .f2k-badge.ind{ background:#F4E8CC; color:#7a5a16; }
        .f2k-badge.live{ background:#D8EEE2; color:#0f4a32; }
        .f2k-mini{ display:flex; gap:16px; margin-top:18px; }
        .f2k-mini .m{ flex:1; } .f2k-mini .k{ font-size:11px; color:${MUTED}; font-family:'IBM Plex Mono',monospace; text-transform:uppercase; letter-spacing:.05em; }
        .f2k-mini .v{ font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:17px; margin-top:3px; }
        .f2k-pending{ display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
          height:320px; border:1px dashed ${LINE}; border-radius:4px; color:${MUTED}; gap:10px; }
        .f2k-pending .big{ font-family:'Archivo',sans-serif; font-weight:700; font-size:20px; color:${INK}; }

        .f2k-foot{ padding:48px 0 64px; border-bottom:0; }
        .f2k-foot p{ font-size:12.5px; color:${MUTED}; max-width:70ch; }
        .f2k-cta{ display:inline-flex; align-items:center; gap:10px; background:${NAVY}; color:#fff;
          font-weight:600; font-size:15px; padding:14px 22px; border-radius:4px; text-decoration:none; margin-top:8px; }
        .f2k-cta:hover{ background:${NAVY_DK}; }

        @media (max-width:860px){
          .f2k-steps{ grid-template-columns:1fr; } .f2k-calc{ grid-template-columns:1fr; }
          .f2k-projects{ grid-template-columns:1fr; }
          .f2k-chain{ grid-template-columns:1fr 1fr; }
          .f2k-node{ border-bottom:1px solid ${LINE}; }
        }
        @media (prefers-reduced-motion:reduce){ .grow{ animation:none } .f2k-livedot{ animation:none } }
      `}</style>

      {/* top bar */}
      <div className="f2k-topbar">
        <div className="f2k-wrap">
          <div className="f2k-brand">Factory<b>2</b>Key · Funders</div>
          <div className="f2k-live"><span className="f2k-livedot" /> live · f2k-projects.vercel.app</div>
        </div>
      </div>

      {/* hero */}
      <section className="f2k-hero">
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">The funding model</div>
          <h1 className="f2k-h1">Demand is<br />the trigger.</h1>
          <p className="f2k-lead">
            F2K takes a development from raw site to delivered homes — sourcing the modular product,
            running the development approvals, coordinating site works, shipping and installation,
            and originating pre-qualified buyer demand through our sales platform. Oversubscribed
            demand is what unlocks the finance. <b style={{ color: INK }}>This page covers that funding piece —
            one link in the chain below.</b> Directed to registered Australian banks (ADIs).
          </p>
        </div>
      </section>

      {/* scope — F2K end to end */}
      <section>
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">What F2K delivers</div>
          <h2 className="f2k-h2" style={{ marginTop: 10 }}>One integrator, raw site to handed-over homes</h2>
          <p className="f2k-lead" style={{ marginBottom: 30 }}>
            F2K coordinates the whole delivery chain — not just the sales platform. Every cost block
            in the model below is something we source, arrange or manage.
          </p>
          <div className="f2k-chain">
            {[
              ["Demand & sales platform", "Portal, agents, pre-qualified registrations"],
              ["Development approvals", "DAs, permits, consultant coordination"],
              ["Module supply", "Source & contract the modular product"],
              ["Site works", "Civils, services, foundations"],
              ["Shipping & logistics", "Sea freight (DDP) + port-to-site transport"],
              ["Installation & complexing", "Crane placement, joining, lock-up"],
              ["Finishing & handover", "Landscaping, fencing, fit-off, settlement"],
            ].map(([t, d], i) => (
              <div className="f2k-node" key={i}>
                <span className="f2k-noden">{String(i + 1).padStart(2, "0")}</span>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="f2k-chainband">
            Coordinated end-to-end by F2K · construction works invoiced through Global Buildtech Australia
          </div>
        </div>
      </section>

      {/* model */}
      <section>
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">The funding component · for registered Australian banks</div>
          <h2 className="f2k-h2" style={{ marginTop: 10 }}>One bank, both arms, back-to-back</h2>
          <div className="f2k-steps">
            <div className="f2k-step" data-n="01">
              <h3>Prove the demand</h3>
              <div className="f2k-steparrow" />
              <p style={{ marginTop: 14 }}>
                The platform goes live and agents market it. We drive pre-qualified registrations to
                <b style={{ color: INK }}> 3× the lots released</b> — 300% cover. That oversubscription is the trigger.
              </p>
            </div>
            <div className="f2k-step" data-n="02">
              <h3>Fund the build</h3>
              <div className="f2k-steparrow" />
              <p style={{ marginTop: 14 }}>
                On that signal the bank's development arm funds construction. Buyer progress-payments
                flow back as the build rises, so the facility peaks low and clears mid-build.
              </p>
            </div>
            <div className="f2k-step" data-n="03">
              <h3>First-rights retail</h3>
              <div className="f2k-steparrow" />
              <p style={{ marginTop: 14 }}>
                In return, the bank's retail arm takes first right of refusal on every end-buyer
                mortgage the platform originates — this project and the pipeline behind it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* the test */}
      <section>
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">The test</div>
          <h2 className="f2k-h2" style={{ marginTop: 10, marginBottom: 16 }}>Is it a fundable project?</h2>
          <div className="f2k-formula">
            <span>(<b>x</b> units <span className="op">×</span> <b>y</b> avg price)</span>
            <span className="op">−</span>
            <span>Σ cost <b>(a+b+c+d…)</b></span>
            <span className="op">=</span>
            <span className="res">margin (CD%)</span>
            <span style={{ color: MUTED }}>— fundable when margin clears the hurdle ({pct(HURDLE)}).</span>
          </div>

          <div className="f2k-calc">
            {/* controls + readout */}
            <div>
              <div className="f2k-controls">
                <div className="f2k-ctl">
                  <label>x · number of units</label>
                  <span className="val">{units}</span>
                  <input type="range" min="6" max="120" value={units}
                    onChange={(e) => setUnits(+e.target.value)} />
                </div>
                <div className="f2k-ctl">
                  <label>y · average selling price</label>
                  <span className="val">{fmt0(price)}</span>
                  <input type="range" min="350000" max="1200000" step="5000" value={price}
                    onChange={(e) => setPrice(+e.target.value)} />
                </div>
                <div className="f2k-ctl">
                  <label>cost per unit (a+b+c+d… ÷ x)</label>
                  <span className="val">{fmt0(costUnit)}</span>
                  <input type="range" min="250000" max="900000" step="1000" value={costUnit}
                    onChange={(e) => setCostUnit(+e.target.value)} />
                </div>
              </div>

              <div className="f2k-readout">
                <div className="f2k-rrow"><span className="k">Revenue · x × y</span><span className="v">{fmt0(model.revenue)}</span></div>
                <div className="f2k-rrow"><span className="k">Total cost · Σ(a…)</span><span className="v">{fmt0(model.totalCost)}</span></div>
                <div className="f2k-rrow"><span className="k">Surplus</span><span className="v" style={{ color: model.surplus >= 0 ? GREEN : "#c0413a" }}>{fmt0(model.surplus)}</span></div>
                <div className="f2k-rrow" style={{ alignItems: "center", paddingTop: 14 }}>
                  <span className="f2k-bigmargin" style={{ color: model.margin >= HURDLE ? GREEN : model.margin >= 0.15 ? "#a87a1e" : "#c0413a" }}>{pct(model.margin)}</span>
                  <Verdict margin={model.margin} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
                Generic gross development margin (pre-GST, pre-finance). Confirmed feasibility is
                assessed on a GST-correct basis, net of finance — see live projects below.
              </p>
            </div>

            {/* signature stack */}
            <div>
              <StackColumn revenue={model.revenue} categories={model.cats} total={model.totalCost} />
            </div>
          </div>
        </div>
      </section>

      {/* live projects */}
      <section>
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">Live projects</div>
          <h2 className="f2k-h2" style={{ marginTop: 10, marginBottom: 20 }}>Real stacks, confirmed by the market</h2>

          <div className="f2k-caveat">
            <div style={{ fontSize: 20, lineHeight: 1, color: TIMBER }}>▲</div>
            <div className="t">
              <b>Project figures are indicative estimates.</b> They are confirmed only once the project
              page is live, agents are actively marketing, and pre-qualified subscriptions reach
              <b> 3× the lots released (300% cover)</b> — not before. Until then, treat the stacks below
              as the modelled basis, not a committed feasibility.
            </div>
          </div>

          <div className="f2k-projects">
            {/* Branscombe */}
            <div className="f2k-card">
              <div className="f2k-cardhead">
                <div>
                  <h3>Branscombe</h3>
                  <div className="sub">Claremont TAS · 37 modular dwellings</div>
                </div>
                <span className="f2k-badge ind">Indicative · pre-subscription</span>
              </div>
              <StackColumn revenue={bransRevenue} categories={bransCats} total={COST_BASE} height={300} />
              <div className="f2k-mini">
                <div className="m"><div className="k">GRV</div><div className="v">{fmtM(bransRevenue)}</div></div>
                <div className="m"><div className="k">Cost (ex-fin)</div><div className="v">{fmtM(COST_BASE)}</div></div>
                <div className="m"><div className="k">Margin*</div><div className="v" style={{ color: GREEN }}>23.0%</div></div>
              </div>
              <p style={{ fontSize: 11.5, color: MUTED, marginTop: 10 }}>
                *GST-correct, on net realisation. Demand to date ~1.5× cover; trigger is 3×.
              </p>
            </div>

            {/* Seafields */}
            <div className="f2k-card">
              <div className="f2k-cardhead">
                <div>
                  <h3>Seafields</h3>
                  <div className="sub">Live · agents active</div>
                </div>
                <span className="f2k-badge live">Live · pricing in progress</span>
              </div>
              <div className="f2k-pending">
                <div style={{ fontSize: 26 }}>◷</div>
                <div className="big">Stack pending confirmation</div>
                <div style={{ fontSize: 13, maxWidth: "30ch" }}>
                  Cost and revenue stacks publish here once the pricing model is finalised and
                  subscriptions build toward 3× cover.
                </div>
              </div>
              <div className="f2k-mini">
                <div className="m"><div className="k">Status</div><div className="v">Live</div></div>
                <div className="m"><div className="k">Subscription</div><div className="v">Building</div></div>
                <div className="m"><div className="k">Stack</div><div className="v">Pending</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <section className="f2k-foot">
        <div className="f2k-wrap">
          <div className="f2k-eyebrow">Talk to us</div>
          <h2 className="f2k-h2" style={{ marginTop: 10, marginBottom: 14 }}>A repeatable, de-risked pipeline</h2>
          <a className="f2k-cta" href="mailto:dennis@factory2key.com.au">Request a project pack →</a>
          <p style={{ marginTop: 24 }}>
            This funding information is directed to registered Australian banks (APRA-authorised ADIs)
            only. Factory2Key Pty Ltd originates demand and integrates the full delivery — module supply,
            development approvals, site works, logistics, installation and completion. Construction
            works are invoiced through Global Buildtech Australia under separate agreement. Figures
            shown are modelled and indicative, do not constitute an offer of finance or a representation
            of feasibility, and are subject to confirmation as described above. © {new Date().getFullYear()}.
          </p>
        </div>
      </section>
    </div>
  );
}
