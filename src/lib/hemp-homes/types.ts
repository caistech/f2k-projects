export type HempHomesStage =
  | "design"
  | "material_development"
  | "engineering"
  | "prototyping"
  | "building"
  | "certification"
  | "install"
  | "community";

export type HempHomesState = "completed" | "in_progress" | "scheduled";

export const HEMP_HOMES_STAGES: { value: HempHomesStage; label: string }[] = [
  { value: "design", label: "Design" },
  { value: "material_development", label: "Material" },
  { value: "engineering", label: "Engineering" },
  { value: "prototyping", label: "Prototyping" },
  { value: "building", label: "Building" },
  { value: "certification", label: "Certification" },
  { value: "install", label: "Install" },
  { value: "community", label: "Community" },
];

export const HEMP_HOMES_STATES: { value: HempHomesState; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export interface HempHomesPost {
  id: string;
  slug: string;
  title: string;
  overview: string;
  stage: HempHomesStage;
  state: HempHomesState;
  hero_media_id: string | null;
  published_at: string | null;
  email_sent_at: string | null;
  email_subject: string | null;
  email_preview: string | null;
  email_html: string | null;
  created_at: string;
  updated_at: string;
}

export interface HempHomesMedia {
  id: string;
  kind: "image" | "video";
  source: "direct" | "drive";
  storage_path: string;
  public_url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  byte_size: number | null;
  alt_text: string | null;
  caption: string | null;
  show_in_gallery: boolean;
  drive_file_id: string | null;
  drive_url: string | null;
  drive_synced_at: string | null;
  drive_modified_at: string | null;
  created_at: string;
}

export interface HempHomesJourneyEntry {
  id: string;
  slug: string;
  date_label: string;
  stage: HempHomesStage;
  state: HempHomesState;
  title: string;
  body: string;
  hero_media_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
