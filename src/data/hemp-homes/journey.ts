export type JourneyStage =
  | "design"
  | "material_development"
  | "engineering"
  | "prototyping"
  | "building"
  | "certification"
  | "install"
  | "community";

export type JourneyState = "completed" | "in_progress" | "scheduled";

export type JourneyEntry = {
  id: string;
  /** Either an ISO date (YYYY-MM-DD) or a quarter label (YYYY-QN). */
  date: string;
  stage: JourneyStage;
  state: JourneyState;
  title: string;
  body: string;
  /** Optional image. Path relative to /public. */
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    caption?: string;
  };
};

export const STAGES: { value: JourneyStage; label: string }[] = [
  { value: "design", label: "Design" },
  { value: "material_development", label: "Material" },
  { value: "engineering", label: "Engineering" },
  { value: "prototyping", label: "Prototyping" },
  { value: "building", label: "Building" },
  { value: "certification", label: "Certification" },
  { value: "install", label: "Install" },
  { value: "community", label: "Community" },
];

export const STATES: { value: JourneyState; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
  { value: "scheduled", label: "Scheduled" },
];

/**
 * Seeded entries. Forward-looking, honest about state. No partner names,
 * no community names. Updated as the build progresses.
 */
export const JOURNEY_ENTRIES: JourneyEntry[] = [
  {
    id: "2026-q3-community-conversations",
    date: "2026-Q3",
    stage: "community",
    state: "in_progress",
    title: "Conversations with potential lighthouse communities.",
    body: "We're in conversation with eco-communities along Australia's eastern seaboard about being the first to host a Joey60 hemp edition. We'll name our first lighthouse community on this page once they've given us permission to do so. If your community would like to be considered, please tell us about it below.",
  },
  {
    id: "2026-q3-engineering-scheduled",
    date: "2026-Q3",
    stage: "engineering",
    state: "scheduled",
    title: "Panel connection design and load testing scheduled.",
    body: "Our engineering partner is preparing the structural work — connection geometry, load tests, and the assembly approach that lets a community build the home on site. We'll publish the test methodology and the first results here as they come in.",
  },
  {
    id: "2026-q2-material-development",
    date: "2026-Q2",
    stage: "material_development",
    state: "in_progress",
    title: "Hemp panel material work is underway.",
    body: "Our materials partner is developing the engineered hemp panel system that will form the walls, floor and roof skin of the Joey60 hemp edition. Sample work is in progress. We'll publish the first physical sample on this page when it lands.",
    image: {
      src: "/hemp-homes/hemp-panel-prototype.jpg",
      alt: "Workshop prototype with hemp panel walls partially finished — hemp panel on the right, plasterboard finish on the left",
      width: 1333,
      height: 1000,
      caption: "Workshop prototype build — hemp panel walls (right) being finished alongside conventional plasterboard (left) for direct comparison.",
    },
  },
  {
    id: "2026-q2-concept-design",
    date: "2026-Q2",
    stage: "design",
    state: "in_progress",
    title: "Concept design on the table.",
    body: "We're translating the Joey60 footprint into a hemp panel build: a 60m² single-storey, one-bedroom layout, designed for a community context. Open kitchen/living running the length, separate bedroom and bathroom, decking on the long side. The first layouts are circulating internally — we'll share images on this page as soon as they're shareable.",
  },
];
