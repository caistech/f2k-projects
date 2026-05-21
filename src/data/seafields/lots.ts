/**
 * Seafields Estate — 145-lot freehold subdivision
 * Source: CLE Plan 3027-08B-01 (Amended Plan of Subdivision, WAPC 202888)
 *         dated 22 April 2026, with V6 lot register derived from the 08B DWG.
 *
 * V6 changes vs V5:
 *   - Lot count corrected to 145 (was 143 in V5; 08B summary box confirms 145)
 *   - Lots 307, 308 added (V5 incorrectly omitted these)
 *   - Lots 293, 349 removed (08B numbering omits)
 *   - Lots 294a/b, 348a/b: DWG has 2 polygons with same number — pending CLE renumber
 *   - Lot 379 reclassified as heritage retention (was 774m² normal; now 818m² heritage)
 *   - Lot 323 heritage retention (1522m², consistent with V5)
 *   - 22 lots have amended geometry in 08B WAPC202888 overlay
 *   - All baseline areas updated to true polygon area (V5 used frontage×depth approximation)
 *   - Zoning corrected from R12.5 to R20 (per CLE / Simon Burnell email 2026-05-05)
 *
 * Allocations live in the seafields_lot_allocations DB table — public site
 * shows Reserved/Available status only, never the allocatee identity.
 */

export type LotCategory = "compact" | "standard" | "large" | "premium" | "heritage";
export type LotStage = '1' | '2' | '3' | '4' | '5' | '6' | '7' | null;

export interface LotData {
  id: string;
  lotNumber: number;
  area: number; // sqm — from 08B polygon geometry
  zone: string;
  category: LotCategory;
  stage: LotStage;
  /** Heritage retention lot — existing building to be retained, not for sale. */
  isHeritage?: boolean;
  /** Lot has duplicate polygon in 08B DWG; pending final CLE renumbering. */
  pendingRenumber?: boolean;
  /** Geometry amended in 08B WAPC202888 amendment overlay. */
  isAmended?: boolean;
  /** Polygon/area hand-patched and not yet confirmed against the 08B DWG. UI should flag to registrants. */
  geometryPending?: boolean;
}

function cat(area: number): LotCategory {
  if (area < 500) return "compact";
  if (area < 600) return "standard";
  if (area < 700) return "large";
  return "premium";
}

function lot(
  n: number,
  area: number,
  zone: string,
  stage: LotStage,
  opts?: { idSuffix?: string; isHeritage?: boolean; pendingRenumber?: boolean; isAmended?: boolean; geometryPending?: boolean }
): LotData {
  const idSuffix = opts?.idSuffix || "";
  return {
    id: `L${n}${idSuffix}`,
    lotNumber: n,
    area,
    zone,
    category: opts?.isHeritage ? "heritage" : cat(area),
    stage,
    ...(opts?.isHeritage && { isHeritage: true }),
    ...(opts?.pendingRenumber && { pendingRenumber: true }),
    ...(opts?.isAmended && { isAmended: true }),
    ...(opts?.geometryPending && { geometryPending: true }),
  };
}

const SUTCLIFFE = "Sutcliffe Road";
const NE_INNER = "Sutcliffe Road / NE Inner";
const PEPPER = "Pepper Gate";
const CENTRAL = "Central";
const SW_BLOCK = "Pepper Gate West / SW Block";
const COLLINS = "Collins Road";

export const LOTS: LotData[] = [
  // Stage 1 — SW Block / GROH-WACHS cluster (20 lots)
  lot(332, 690, SW_BLOCK, "1", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(333, 537, SW_BLOCK, "1", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(334, 613, SW_BLOCK, "1"),
  lot(335, 596, SW_BLOCK, "1"),
  lot(336, 643, SW_BLOCK, "1"),
  lot(337, 570, SW_BLOCK, "1"),
  lot(338, 570, SW_BLOCK, "1"),
  lot(339, 570, SW_BLOCK, "1"),
  lot(340, 570, SW_BLOCK, "1"),
  lot(341, 646, SW_BLOCK, "1"),
  lot(342, 646, SW_BLOCK, "1"),
  lot(343, 666, SW_BLOCK, "1"),
  lot(344, 666, SW_BLOCK, "1"),
  lot(345, 646, SW_BLOCK, "1"),
  lot(346, 646, SW_BLOCK, "1"),
  lot(347, 570, SW_BLOCK, "1"),
  lot(348, 570, SW_BLOCK, "1", { idSuffix: "a", pendingRenumber: true }),
  lot(348, 570, SW_BLOCK, "1", { idSuffix: "b", pendingRenumber: true }),
  lot(350, 570, SW_BLOCK, "1"),
  lot(351, 646, SW_BLOCK, "1"),

  // Stage 2 — Carved-out heritage / house lot (1 lots)
  lot(323, 1522, CENTRAL, "2", { isHeritage: true }),  // heritage retention

  // Stage 3 — Central (24 lots) — Lot 307 moved here from Stage 6 per CLE/Uwe 2026-05-21 (spatially adjacent to 308; was misfiled in V6 reconciliation)
  lot(307, 536, CENTRAL, "3", { isAmended: true }),  // NEW in 08B (V5 omitted); stage corrected 2026-05-21
  lot(308, 685, CENTRAL, "3", { isAmended: true }),  // NEW in 08B (V5 omitted)
  lot(309, 614, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(310, 510, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(311, 505, CENTRAL, "3"),
  lot(312, 510, CENTRAL, "3"),
  lot(313, 525, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(314, 614, CENTRAL, "3"),
  lot(315, 560, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(316, 794, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(317, 658, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(318, 595, CENTRAL, "3"),
  lot(319, 595, CENTRAL, "3"),
  lot(320, 595, CENTRAL, "3"),
  lot(321, 595, CENTRAL, "3"),
  lot(322, 749, CENTRAL, "3"),
  lot(324, 630, CENTRAL, "3"),
  lot(325, 682, CENTRAL, "3"),
  lot(326, 682, CENTRAL, "3"),
  lot(327, 772, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(328, 704, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(329, 804, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(330, 721, CENTRAL, "3", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(331, 748, CENTRAL, "3", { isAmended: true }),  // re-extracted 2026-05-12 with bulge/arc-aware extractor — confirmed 50m x 15m base polygon, 749 m2 in CLE 08B

  // Stage 4 — Pepper Gate Inner (12 lots)
  lot(261, 536, PEPPER, "4"),
  lot(262, 517, PEPPER, "4"),
  lot(263, 589, PEPPER, "4"),
  lot(264, 523, PEPPER, "4"),
  lot(265, 527, PEPPER, "4"),
  lot(266, 606, PEPPER, "4"),
  lot(267, 598, PEPPER, "4"),
  lot(268, 685, PEPPER, "4"),
  lot(269, 619, PEPPER, "4", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(270, 548, PEPPER, "4", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(271, 629, PEPPER, "4"),
  lot(272, 600, PEPPER, "4"),

  // Stage 5 — Sutcliffe Road / NE Inner (25 lots)
  lot(236, 554, SUTCLIFFE, "5"),
  lot(237, 525, SUTCLIFFE, "5"),
  lot(238, 815, SUTCLIFFE, "5"),
  lot(239, 751, SUTCLIFFE, "5"),
  lot(240, 595, SUTCLIFFE, "5"),
  lot(241, 595, SUTCLIFFE, "5"),
  lot(242, 624, SUTCLIFFE, "5"),
  lot(243, 561, SUTCLIFFE, "5"),
  lot(244, 483, SUTCLIFFE, "5"),
  lot(245, 473, SUTCLIFFE, "5"),
  lot(246, 462, SUTCLIFFE, "5"),
  lot(247, 511, SUTCLIFFE, "5"),
  lot(248, 600, SUTCLIFFE, "5"),
  lot(249, 638, SUTCLIFFE, "5"),
  lot(250, 502, SUTCLIFFE, "5"),
  lot(251, 502, SUTCLIFFE, "5"),
  lot(252, 503, SUTCLIFFE, "5"),
  lot(253, 503, SUTCLIFFE, "5"),
  lot(254, 502, SUTCLIFFE, "5"),
  lot(255, 569, SUTCLIFFE, "5"),
  lot(256, 818, SUTCLIFFE, "5"),
  lot(257, 520, NE_INNER, "5"),
  lot(258, 545, NE_INNER, "5"),
  lot(259, 559, NE_INNER, "5"),
  lot(260, 524, NE_INNER, "5"),

  // Stage 6 — Central Upper (34 lots) — Lot 307 relocated to Stage 3 per CLE/Uwe 2026-05-21
  lot(273, 595, CENTRAL, "6"),
  lot(274, 525, CENTRAL, "6"),
  lot(275, 525, CENTRAL, "6"),
  lot(276, 595, CENTRAL, "6"),
  lot(277, 595, CENTRAL, "6"),
  lot(278, 525, CENTRAL, "6"),
  lot(279, 525, CENTRAL, "6"),
  lot(280, 595, CENTRAL, "6"),
  lot(281, 595, CENTRAL, "6"),
  lot(282, 595, CENTRAL, "6"),
  lot(283, 598, CENTRAL, "6"),
  lot(284, 598, CENTRAL, "6"),
  lot(285, 595, CENTRAL, "6"),
  lot(286, 595, CENTRAL, "6"),
  lot(287, 595, CENTRAL, "6"),
  lot(288, 525, CENTRAL, "6"),
  lot(289, 525, CENTRAL, "6"),
  lot(290, 595, CENTRAL, "6"),
  lot(291, 595, CENTRAL, "6"),
  lot(292, 783, CENTRAL, "6", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(294, 797, CENTRAL, "6", { idSuffix: "a", pendingRenumber: true, isAmended: true }),  // amended in 08B (WAPC202888)
  lot(294, 797, CENTRAL, "6", { idSuffix: "b", pendingRenumber: true, isAmended: true }),  // amended in 08B (WAPC202888)
  lot(295, 691, CENTRAL, "6"),
  lot(296, 680, CENTRAL, "6"),
  lot(297, 680, CENTRAL, "6"),
  lot(298, 680, CENTRAL, "6"),
  lot(299, 680, CENTRAL, "6"),
  lot(300, 680, CENTRAL, "6"),
  lot(301, 680, CENTRAL, "6"),
  lot(302, 580, CENTRAL, "6", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(303, 680, CENTRAL, "6"),
  lot(304, 600, CENTRAL, "6"),
  lot(305, 610, CENTRAL, "6", { isAmended: true }),  // amended in 08B (WAPC202888)
  lot(306, 650, CENTRAL, "6", { isAmended: true }),  // amended in 08B (WAPC202888)

  // Stage 7 — Collins Road (29 lots)
  lot(352, 593, COLLINS, "7"),
  lot(353, 555, COLLINS, "7"),
  lot(354, 555, COLLINS, "7"),
  lot(355, 555, COLLINS, "7"),
  lot(356, 629, COLLINS, "7"),
  lot(357, 629, COLLINS, "7"),
  lot(358, 629, COLLINS, "7"),
  lot(359, 555, COLLINS, "7"),
  lot(360, 555, COLLINS, "7"),
  lot(361, 555, COLLINS, "7"),
  lot(362, 555, COLLINS, "7"),
  lot(363, 555, COLLINS, "7"),
  lot(364, 629, COLLINS, "7"),
  lot(365, 629, COLLINS, "7"),
  lot(366, 629, COLLINS, "7"),
  lot(367, 647, COLLINS, "7"),
  lot(368, 647, COLLINS, "7"),
  lot(369, 647, COLLINS, "7"),
  lot(370, 571, COLLINS, "7"),
  lot(371, 571, COLLINS, "7"),
  lot(372, 571, COLLINS, "7"),
  lot(373, 571, COLLINS, "7"),
  lot(374, 571, COLLINS, "7"),
  lot(375, 647, COLLINS, "7"),
  lot(376, 647, COLLINS, "7"),
  lot(377, 647, COLLINS, "7"),
  lot(378, 685, COLLINS, "7"),
  lot(379, 818, COLLINS, "7", { isHeritage: true }),  // heritage retention
  lot(380, 819, COLLINS, "7"),
];

/** Category display info */
export const CATEGORY_INFO: Record<LotCategory, { label: string; size: string }> = {
  compact:  { label: "Compact",  size: "Under 500 sqm" },
  standard: { label: "Standard", size: "500-599 sqm" },
  large:    { label: "Large",    size: "600-699 sqm" },
  premium:  { label: "Premium",  size: "700+ sqm" },
  heritage: { label: "Heritage", size: "Existing building retained — not for sale" },
};

/** Stage infrastructure metadata (matches CLE Plan 3027-08B-01 V6 register) */
export const STAGE_INFO: Record<Exclude<LotStage, null>, {
  label: string;
  color: string;
  border: string;
  title: string;
}> = {
  '1': { label: 'Stage 1', color: '#B7D5EC', border: '#5694C3', title: 'Stage 1 — SW Block' },
  '2': { label: 'Stage 2', color: '#F5E7D6', border: '#C7A877', title: 'Stage 2 — Heritage / House Lot' },
  '3': { label: 'Stage 3', color: '#F4B0A6', border: '#D06A5B', title: 'Stage 3 — Central' },
  '4': { label: 'Stage 4', color: '#F7E877', border: '#BFA024', title: 'Stage 4 — Pepper Gate Inner' },
  '5': { label: 'Stage 5', color: '#B8D99B', border: '#6B9B4A', title: 'Stage 5 — Sutcliffe Road' },
  '6': { label: 'Stage 6', color: '#C9B2D5', border: '#8A6AA7', title: 'Stage 6 — Central Upper' },
  '7': { label: 'Stage 7', color: '#D6D6D6', border: '#9A9A9A', title: 'Stage 7 — Collins Road' },
};

/**
 * Approximate stage anchor positions on the CLE plan (site-plan-hires.jpg)
 * expressed as (x%, y%) of the canvas. Used by the Plan View overlay.
 * Inherited from V5; will be re-derived from polygon centroids in step 2.
 */
export const STAGE_ANCHORS: Record<Exclude<LotStage, null>, { x: number; y: number }> = {
  '7': { x: 52, y: 14 },
  '6': { x: 52, y: 36 },
  '5': { x: 82, y: 42 },
  '3': { x: 55, y: 53 },
  '4': { x: 72, y: 55 },
  '2': { x: 27, y: 70 },
  '1': { x: 18, y: 76 },
};
