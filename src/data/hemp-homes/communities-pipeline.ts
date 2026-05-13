export type AnonymisedCommunityTile = {
  /** Internal-only ID, NOT a community name. Never rendered. */
  id: string;
  wave: 1 | 2 | 3;
  status: "active" | "in_conversation" | "watchlist";
  state: "QLD" | "NSW" | "VIC" | "TAS" | "ACT" | "SA" | "WA" | "NT";
  /** Region descriptor only — no community name. */
  regionDescriptor: string;
  /** One sentence, no identifying details. */
  blurb: string;
};

/**
 * Pre-consent pipeline. Communities named publicly only once they have
 * given written permission (PR 4 introduces the first named sub-page).
 */
export const COMMUNITIES_PIPELINE: AnonymisedCommunityTile[] = [
  {
    id: "wave-1-qld-hinterland",
    wave: 1,
    status: "active",
    state: "QLD",
    regionDescriptor: "Sunshine Coast hinterland",
    blurb: "Established permaculture community with development approval for additional dwellings.",
  },
  {
    id: "wave-2-nsw-central-coast",
    wave: 2,
    status: "in_conversation",
    state: "NSW",
    regionDescriptor: "Central Coast",
    blurb: "Long-running ecovillage with active expansion planning.",
  },
  {
    id: "wave-2-qld-permaculture",
    wave: 2,
    status: "in_conversation",
    state: "QLD",
    regionDescriptor: "South-east Queensland",
    blurb: "Permaculture village in early conversations about hemp-built dwellings.",
  },
  {
    id: "wave-3-vic-coastal",
    wave: 3,
    status: "watchlist",
    state: "VIC",
    regionDescriptor: "Bass Coast",
    blurb: "Coastal eco-development pursuing modular pathways.",
  },
  {
    id: "wave-3-tas-rural",
    wave: 3,
    status: "watchlist",
    state: "TAS",
    regionDescriptor: "South-east Tasmania",
    blurb: "Rural community exploring small-footprint housing for older members.",
  },
];
