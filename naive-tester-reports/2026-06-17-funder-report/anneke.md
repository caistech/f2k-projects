# Funder Demand-Coverage walkthrough — Anneke (domain operator, 25+ yrs property dev / lender-facing)

**Target:** `https://f2k-projects-git-feat-funder-dema-c553d4-corporate-ai-solutions.vercel.app`
**Date:** 2026-06-17
**Brief:** Decide whether I'd trust this enough to hand a credit team. Walk the public landing, then reach `/admin/reports` (the Funder Demand-Coverage Report). I care most about whether a demand report is honest enough to put in front of a bank.

**Headline:** I could not reach `/admin/reports` — it is correctly gated behind an admin login I have no credentials for, and I did not (and will not) fabricate what's behind it. But the **public bank-facing funder pages are reachable, and they ARE the demand-coverage artifact in everything but name** — same 3× cover trigger, same cost stack, same subscription figure. So I assessed those hard, because that's the material a banker actually sees first. Verdict on what I could observe: **PASS, with two honesty/consistency findings a credit team WILL pick up.**

---

## Section 1 — Public landing (`/`)

Clean, credible, and it leads with the right disclaimer: a persistent top ribbon "REGISTRATION OF INTEREST ONLY — No deposit is required or accepted." That's the correct posture for a real-estate marketing site and it's exactly what keeps you out of trouble. Tab title is the product name ("Factory2Key Projects — Australian Housing Developments"), not a scaffold default. Good.

The state-map → estate-pin navigation is a nice touch and scales; six estates listed with honest status badges (Registration Open / Coming Soon / Concept Stage / In Development). No overclaiming — Dutton Terrace is openly "Concept Stage," Wavecrest "Coming Soon." I like that a developer is willing to show the half-built pipeline rather than only the finished shopfront.

**What's missing for my eye:** nothing on the landing points a *funder* anywhere. There is a "For Developers" nav item but no "For Funders" / "For Banks" entry. The funder pages exist (`/funders`, `/branscombe-estate/funders`) but a bank that lands on the homepage has no breadcrumb to them — they're effectively unlisted. If the funder journey is deliberately by-invitation, fine; but if you want inbound from an ADI's project-finance desk, they can't find the door.

> **Opportunity:** a discreet "For Funders" link in the footer (alongside Privacy) or a one-line "Funding partners → " in the nav. Banks won't sign up through the buyer ribbon.

---

## Section 2 — The bank-facing funder page (`/branscombe-estate/funders`) — this is the demand-coverage artifact

This is the screen I'd actually be handed in a pitch, so I read it the way a credit analyst would. It's genuinely well-constructed. The ribbon is correctly re-scoped for this audience: "FOR REGISTERED AUSTRALIAN BANKS (ADIs) — Registration of interest only. Not an offer or invitation, and not financial product advice." Good — you've separated the buyer disclaimer from the funder disclaimer.

**The four blocks, and how they read to a lender:**

1. **Cost stack vs revenue.** Revenue $25.35M; Land $2.50M / Site works $3.50M / Modules $7.31M / Shipping-sea $1.80M; Margin $7.61M. Total development cost (ex-finance) $17,735,006. **Indicative margin 23%, GST-correct, on net realisation.** The "ex-finance" and "GST-correct on net realisation" qualifiers are the right words — that's how a feasibility actually gets assessed, and putting them on the page tells me whoever built this has sat across a credit table. I'm a fan.

2. **Capital stack.** Funding package $8.00M; senior commits 50% ($4.00M) + first right of refusal on the retail mortgage book; juniors share the other 50% in 10–50% tranches; every party a registered ADI. Clear, conventional, and the senior-retail-FRoR-for-discount logic is a real incentive a bank desk would understand immediately.

3. **Demand / subscription — the honesty crux.** "Construction finance is called only once pre-qualified subscriptions reach 3× the lots released (300% cover). **Current demand ≈ 1.5× cover (≈55 registrations vs 37 lots).** 1.5× of the 3× trigger (50% of the way there)."

   This is the most important paragraph on the whole site, and I want to be candid about it. **The honesty *framing* is excellent** — it states the current subscription, the trigger, the gap, and repeats "indicative until 3× cover" everywhere. That's more disciplined than most developer demand decks I've been handed, which quote a headline "X registrations of interest!" and hope you don't ask what it covers.

   But a credit team will immediately ask: **what is a "pre-qualified registration"?** 55 registrations vs 37 lots is being presented as 1.5× *cover of the funding trigger*. A banker will want to know (a) what qualifies a registration as "pre-qualified" (finance pre-approval? deposit-capable? just an email?), (b) whether one person registering interest in three lots counts as three, and (c) the conversion assumption from "registration of interest" to settled sale. Right now the number is asserted, not evidenced. The page is honest about *what the number is* but not about *how it was derived* — and for a bank, the derivation IS the report.

   > **This is the single thing that decides whether the report is "honest enough to hand a bank."** The trigger discipline is genuinely good. The missing piece is the audit trail under "≈55 registrations": pre-qual definition, dedup policy, and the registration→sale conversion basis. Without that, a credit officer treats 1.5× as marketing, not coverage. **If `/admin/reports` exposes that derivation, this becomes bankable; if it just restates 55/37 prettier, it does not.** I could not verify which (see Section 4).

4. **Registration form.** Senior/junior radio, bank name, contact, role, bank-domain email expected (nice), mobile, division/desk, mandate-PDF upload. Two required acknowledgements: an ADI-confirmation tick and a ROI/no-offer/consent-to-email tick with an unsubscribe promise and a "funder terms" link. That's the right compliance shape for a commercial-email + financial-services context. Senior position auto-fills $4,000,000 read-only "derived from the project package" — good, you're not letting them hand-key the headline number.

   **Bug (minor):** the ADI-confirmation checkbox reads literally "I confirm **[institution]** is a registered Australian bank…" — the `[institution]` placeholder does not interpolate the bank name typed into the form. It should echo the entered institution, or drop the bracket and say "the named institution." A bank lawyer will notice an unfilled template token in a confirmation they're being asked to legally attest to.

**Responsive:** I checked 375px and 1440px. No horizontal scroll at mobile (scrollWidth == clientWidth), the capital stack / demand bar / voice card / form all stack cleanly, touch targets look thumb-sized. Passes §1.

**Voice agent ("Sloane"):** present and on-message — "Senior or junior? Sloane will walk you through it… It's optional — the form works on its own — and this is a registration of interest only, not advice or an offer." Correctly scoped so the agent doesn't stray into advice. Reachable in one click from the funder page. Passes §6.

---

## Section 3 — Portfolio funder page (`/funders`) — and a consistency finding

This page is actually the better demand-model explainer: it lays out the full delivery chain (demand platform → DAs → module supply → site works → shipping → install → finishing), the "prove demand / fund the build / first-rights retail" logic, the capital stack, and a "Is it a fundable project?" calculator: **37 units × $685,000 avg = $25,345,000 revenue; cost/unit $479,324; surplus $7,610,012; 30% Fundable** (labelled "Generic gross development margin, pre-GST, pre-finance").

Live-projects strip repeats Branscombe at GRV $25.35M / Package $8.00M / **Margin 23% (GST-correct), demand ≈1.5× cover, trigger 3×.** Seafields/Wavecrest/Hemp Homes are honestly shown as "Pending model — stack publishes once subscriptions build toward 3× cover." Again, I respect that the unfinished ones are openly pending rather than faked.

**Finding — two margins on the same project.** The portfolio page headlines Branscombe at **30% "Fundable"** (generic, pre-GST, pre-finance) and the same page's live strip + the Branscombe funder page say **23%** (GST-correct, net of finance). Both bases are disclosed, and the page even says "confirmed feasibility is assessed on a GST-correct basis… see live projects below" — so this is *defensible*, not deceptive. But a credit analyst skimming will see "30%" and "23%" against the identical $25.35M GRV and ask which one is real. The honest answer (23% is the real basis; 30% is a generic illustrative hurdle-check) needs to be louder, or the 30% generic calculator shouldn't reuse Branscombe's exact actuals — use round illustrative numbers so nobody cross-reads them as two feasibilities for one project.

> **Opportunity:** make the generic "Is it fundable?" calculator use obviously-illustrative inputs (or a slider), so it can't be mistaken for a second, rosier feasibility on a named live project. Two different margins on one project name is the kind of thing that costs you credibility in the first 90 seconds of a credit meeting even when both are technically correct.

No console errors on any funder page. Footer carries Factory2Key Pty Ltd identity, ABN-bearing entity language, "construction works invoiced through Global Buildtech Australia under separate agreement" — that GBA disclosure is the right kind of structural honesty.

---

## Section 4 — The admin Funder Demand-Coverage Report (`/admin/reports`) — UNREACHABLE, gated correctly

`/admin/reports` redirects to `/admin/login?redirectTo=%2Fadmin%2Freports` (it bounced from the preview host to the production host `f2k-projects.vercel.app/admin/login` in doing so — worth a glance, see note). I have **no credentials**, and I will not invent or bypass them. So I cannot, and will not, report on the contents of the actual report. **What is behind that login — the real demand-coverage report — I did not see.** Any judgement on its honesty is therefore reserved.

What I *can* assess is the login experience, and it's clean:

- **No Vercel SSO / 401 wall** in front of the app — the deployment loads straight to the product, which is what you want for a testable preview. Good.
- Login page: Email + Password + **"Show password" toggle** (verified it flips the field to `type=text` and the button to "Hide password [pressed]"), a **magic-link** option, and a **forgot-password** link. The Sign In button is correctly **disabled until fields are filled**.
- **Forgot-password works:** I entered an email, clicked it, and got an inline confirmation "Password reset link sent to anneke.test@example.com. Check your inbox." That's a real, wired reset path, not a dead link. Passes §2 in full.
- Tab title is the product name; admin shell branded "F2K Projects Admin / Factory2Key."

**Testability note for the team:** `/admin/reports` 307'd from the *preview* deploy domain to the *production* `f2k-projects.vercel.app` login. That's fine functionally, but it means a tester evaluating *this preview* gets pushed to prod auth — worth confirming the redirect host is intentional and not leaking preview testers onto the live admin.

Because the report itself is gated, **my core mandate — "is the demand report honest enough to hand a bank?" — is answered against the public funder pages, which carry the same numbers.** On those: the *trigger discipline and disclaimer framing are bank-grade*; the *derivation of the 55-registration / 1.5×-cover figure is not shown*, and that derivation is the one thing a credit team needs before they'd rely on it.

---

## Would I trust this enough to take to a lender?

**The shell, yes; the demand number, not yet — pending the derivation.** The structure is the work of someone who understands project finance: GST-correct net-of-finance margin, senior/junior syndicate, retail-FRoR incentive, ADI-only gating, a 3× oversubscription trigger that finance is genuinely withheld behind, and relentless "indicative until 3× cover" honesty. I have been handed far flimsier decks by far more confident developers.

The gap is the audit trail under "≈55 registrations." A bank does not fund on a headline coverage ratio; it funds on *how that ratio was built* — pre-qualification definition, dedup, and conversion assumption. If the gated `/admin/reports` exposes that (and I couldn't see whether it does), this is bankable. If it just restates 55/37, the honest framing is doing work the underlying data hasn't earned yet.

---

## Standards Check

- **§1 Responsive** — ✅ Funder page: no horizontal scroll at 375px (scrollWidth==clientWidth), stacks cleanly; landing reflows; verified 375 + 1280.
- **§2 Auth-page pattern** — ✅ Admin login has password visibility toggle (verified flips type=text), magic-link, and a working forgot-password (got "reset link sent" confirmation).
- **§4 Authenticated chrome + Settings** — — Could not reach (no admin credentials); not observable on public pages.
- **§5 Explanatory header** — ✅ Every funder page/panel opens with what-it-is/why-it-matters ("Fund this project · for registered Australian banks", "Demand is the trigger"); buyer pages too.
- **§6 Voice agent** — ✅ "Sloane" voice surface reachable in one click on both funder pages, correctly scoped to not give advice.
- **§7 Scaffold metadata** — ✅ Tab title is the product name on landing, funder pages, and admin ("Factory2Key Projects — Australian Housing Developments"); no "Create Next App".
- **§8.5 Dual-portal separation** — ✅ Public/user content reaches real pages; `/admin/*` correctly bounces to `/admin/login` and does not leak into the user experience.
- **§9 Codicils (observable)** — 🟡 Consent/ROI acknowledgements are present and well-worded with consequence stated before submit; next action is always obvious (zero dead ends). BUT the ADI-confirmation checkbox shows an un-interpolated "[institution]" placeholder — a content bug on a legal attestation. (Address autocomplete n/a — funder forms have no address field.)

---

### Concrete fixes, priority order
1. **Show the derivation of the coverage figure** (pre-qual definition, dedup policy, registration→sale conversion) wherever "≈55 registrations / 1.5× cover" appears — or behind a "how this is calculated" link. This is what makes it bankable.
2. **Fix the `[institution]` placeholder** in the ADI-confirmation checkbox — interpolate the entered bank name or reword.
3. **De-conflict the 30% vs 23% margins** on the same project — make the generic calculator obviously illustrative so it can't be cross-read as a second feasibility.
4. **Give funders a way in from the homepage** (footer "For Funders" link) if inbound from ADIs is wanted.
5. **Confirm the preview→prod admin-login redirect host** is intentional.

Anneke
