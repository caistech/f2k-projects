# Lot 91 / 2 Brownlie Street — H&L Display-Home Package Costing

**Internal record. Not public.** Captures the H&L package economics Uwe Jacobs (Property
Friends) built for the Wavecrest display home, sent 2026-06-26 (*"Proposed Lot 91 / 2 Brownlie
Street Wavecrest"*, attachment `H L Packages Wavecrest (1).xlsx`). Lot 91 (DA Lot 84, Council
Ref A30194 / TP26/097, approved 2 June 2026) is the **display home** — a feature within the estate,
not a saleable lot — sold to an investor turnkey "as is" and leased back by F2K as the display.

Source of truth for the package model. The structured copy lives on the `wavecrest_lot_allocations`
Lot 91 row (internal cost columns + notes), migration `0061`. The public lot register never shows
these figures (the API suppresses price on this lot; `retail_price` stays NULL).

---

## 1. Build-up (Uwe's sheet — arithmetic verified, all formulas tie out)

### Land
| Line | $ |
|---|---|
| Land contract value | 250,000 |
| Stamp duty (per PIA) | 6,935 |
| Transfer of title | 500 |
| Conveyancing (buy/sell) | 2,500 |
| **Subtotal — land cost** | **259,935** |
| Land sale value | 290,000 |
| **Land gross margin** | **30,065** (10.4%) |

### House (Koala-Augusta + display additions)
| Line | $ |
|---|---|
| House — Koala-Augusta list price | 327,700 |
| Site landscaping + cleaning afterwards | 15,000 |
| Freshen up after lease | 5,000 |
| Additional scope (below) | 19,400 |
| **Subtotal — house cost** | **367,100** |
| House sale value | 390,000 |
| **House gross margin** | **22,900** (5.9%) |

**Additional scope ($19,400)** — the standalone-display items:
O/h cupboards 1,500 · hotplates ×2 250 · window furnishings 3,000 · wire fencing (~133 lm @ ~$30/m)
7,500 · clothesline 250 · TV antenna incl install 400 · Starlink (~$500 buy + ~$90/mth × 9 ≈ $1,500)
1,500 · driveway 5,000.

### Package
| | Cost | Sale | GM |
|---|---|---|---|
| **Total turnkey package** | **627,035** | **680,000** | **52,965** (7.8%) |

### Rent-back (paid BY F2K to the investor)
- 7% gross yield on $680,000 → $915/wk theoretical; **Uwe uses $900/wk**.
- Modelled 26 weeks (6 mths) → **$23,400 cost to F2K**.

---

## 2. Sense-check notes (for the reply to Uwe)

- **Stamp duty $6,935 is exactly correct** — WA residential transfer-duty rate on $250k
  ($3,135 + 3.80% over $150k). No correction.
- **Two-contract land/house split is correct structuring** — investor pays duty on the $290k land
  only, not the house.
- **Rent-back is the real margin lever, not the build cost.** The $52,965 GM is *before* the
  leaseback F2K pays:
  - 6 mths (26 wk × $900): −$23,400 → **net ~$29,565**
  - 12 mths (52 wk × $900): −$46,800 → **net ~$6,165**, before the $5,000 freshen-up.
  Profitable as a 6-month display; ~break-even at 12. Good deal overall (F2K gets a furnished
  display fronting ~1,860 lots while the investor owns the asset on a 7% yield) — but the display
  *duration* should be a deliberate choice.
- **Two line items worth a second look** (Uwe flagged both with "???"): **driveway $5,000** is light
  if it's concrete/paved for a display frontage (concrete ≈ $8–15k); **fencing $7,500** is fine.

---

## 3. The services question — answered (the 10m rule + the Lot 91 SOW)

Uwe asked: what would it cost to hook the home up to services, *over and above* the standard
allowance already inside the Koala $327,700.

**The operative rule (per the contract documentation):** the standard allowance includes the service
**connection works with trenching up to a point of connection within 10m of the home**; any
trenching/runs **beyond that 10m are payable separately.** (Modular WA's electrical + plumbing
provisional-sum scope is written to that 10m assumption — see §4.)

**What's actually at Lot 91 (from `F2K-SOW-2026-L91-001` Rev 1.3 §3, §9 — F2K's own scope):**

| Service | Status at the lot | Cost picture |
|---|---|---|
| **Power (UPD)** | **Underground stub at the boundary, both frontages** (Montgomery R002) | Connection within 10m included; run boundary-stub→slab on a 2,148m² lot likely **>10m** → over-length trenching/cable is the extra. **Connection fee + connection paid direct by Client** (SOW §9.1). |
| **Water** | **Stub at the boundary, both frontages** | Same as power — within 10m included, over-10m extra; **connection fee + connection by Client.** |
| **Sewer** | **None — NO reticulated sewer.** Home runs on **septic tank + leach drains, the PERMANENT solution** (CGG-approved for display *and* permanent dwelling, no change of use if sold/rented — SOW §9.2). | **No mains-sewer cost ever; no future "deep sewer" connection; no septic decommission.** Earthworks does the tank/leach trenching; tank supply + licensed-plumber connection + certification + CGG Environmental Health approval/fees are a **separate plumbing scope.** |
| **Telco** | Not in the subdivision note; provisional. Display runs on **Starlink** (in Uwe's $19,400 scope). | Fixed/NBN not yet available → carried provisional. |
| **Gas** | Not applicable (no reticulated gas, Geraldton). | Nil. |

### So the "additional over the $327,700" is NOT a deep-sewer/decommission job. It is:
1. **Over-10m service trenching + cable/pipe** for the power + water runs from the boundary stub to
   the slab (the metres beyond the 10m included point) — sized off Modular WA **A101 Rev L** (pending)
   and the **on-site engineering meeting (19 June 2026)**. Indicatively a few $k.
2. **Western Power + Water Corp connection fees** — paid direct by Client (SOW §9.1).
3. **Site main switchboard** — Modular WA excludes it ("common infrastructure") (~$1,500–3,000).
4. **Septic system** — tank supply + plumber connection + certification + CGG Environmental Health
   fees (separate licensed-plumber scope; the earthworks contractor only digs the tank/leach trench).

**Indicative all-in to fully connect power + water:** order of **$4,000–8,000** (over-10m trenching +
authority connection fees + switchboard), with **no sewer connection cost** (septic is permanent) and
no gas. The over-10m metre count — the one real variable — comes off A101 Rev L / the on-site meeting,
which Dennis attended, so the firm figure is his to confirm.

> **Correction note:** an earlier pass of this doc (and the first two email drafts) framed this as a
> "deep-sewer connection + septic decommission, future event tied to subdivision servicing, ~$15–25k."
> That was wrong: power + water are already stubbed at the boundary, and septic is the **permanent**
> sewer solution (no mains sewer, no decommission). The corrected picture is above.

---

## 4. Modular WA build contract — inclusions evidence (Drive)

**File:** `Lot 91$232K  Modular WA Quote Proposed Contract - Detailed - Halfmoon Drive - 5 11 25.pdf`
(Drive id `1bGkN_b2tccI1C5OiUU0_bloDdDLtw1-J`). Modular WA Job **Q25203.1**, Proposed Contract
**JS921**, costing date 17/09/2025. Client **Global Buildtech Australia**. Base model **ELEVATE -
AUGUSTA** (= the "Koala-Augusta"; the Lot 91 dwelling is the **Koala70 2x1** variant, 15m × 4.8m,
BAL-12.5 — SOW §5.1). ⚠️ Site address on this comparable reads "Half Moon Drive — Augusta Premium";
it's the Augusta base filed as the Lot 91 quote, not a Brownlie-St-specific final contract — inclusions
are MWA's standard Augusta boilerplate.

**Quote summary (ex GST):** Base ELEVATE-AUGUSTA $170,300 + Client Upgrades $15,158 + Fixed Price
Site Works $17,204 = **$202,662 ex GST → $222,928.82 inc GST.** Provisional sums total **$0** (all Declined).

**The 10m connection scope (the rule Uwe asked about):**
- **Electrical PS — $5,570 ex:** single-phase runs + comms conduit (draw wire), module join-up, TV
  reception, commissioning. *"Assume point of connection on lot within 10m of building."* Excludes
  headworks fees + **site main switchboard**.
- **Plumber PS — $8,437 ex:** water main run to house, sewer drains to sewer system, HWS connection,
  commissioning. *"Assume point of connection on lot within 10m of building."* Excludes headworks fees.

These PS lines were **Declined on the JS921 comparable** (so F2K coordinates connections itself — the
boundary→slab trenching sits with the earthworks contractor per SOW §9.1, and the authority
connection fees are paid direct by Client). The operative commercial rule still holds: **connection to
10m is the standard scope; over-10m is the chargeable extra.**

- **Excluded from base (verbatim themes):** headworks/fees for water/power/comms; utility services +
  connection points "provided by Client"; site main switchboard; siteworks; demolition; vegetation
  clearing; rock breaking / hard digging; Western Power line-lift escorts.
- **Other PS offered but Declined:** earthworks $9,440 · soak well + downpipes $9,086 · Colorbond
  dividing fence 45 lm + gate $9,747 · soft landscaping $17,700 · hard landscaping (100 m² paving)
  $19,470 · temp fencing $1,180 · house set-out $1,060 · skip + site toilet $2,065. (Charged "invoice
  cost + 18% + GST" if later added.) Uwe's display "additional scope" + landscaping lines fill these.

---

## 5. Open items
- ~~Confirm the Koala $327,700 connection allowance~~ — **ANSWERED (§3/§4):** connection to 10m is the
  standard scope; over-10m + connection fees + switchboard are the adds. No sewer cost (septic permanent).
- **Pin the over-10m metre count** off Modular WA A101 Rev L + the 19 June on-site meeting → the one
  number needed for a firm services figure (Dennis attended the meeting).
- Confirm whether a **Brownlie-St-specific** final MWA contract exists (comparable on file is the
  Half Moon Drive Augusta) and that its inclusions match.
- Confirm display duration (6 vs 12 mths) — drives net margin.
- Driveway spec/cost (limestone vs concrete) for the display frontage.
- Uwe will replicate this model for the Seafields packages (not as a display).
