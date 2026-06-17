// Estate admin nav config — the per-estate section sets the admin sidebar's estate switcher renders.
//
// The State→Location→Estate hierarchy itself is read from the estate registry (src/data/estates.ts),
// so a newly-onboarded estate appears in the switcher automatically. This file only declares WHICH
// admin sections each estate has (archetype-aware: Seafields has lots/stages, Branscombe has units,
// Hemp Homes has journey/prospects/outreach). Sections point at the EXISTING admin routes — the
// route standardisation to /admin/estates/[slug]/[section] (doc T3) is a separate follow-up; the
// switcher works against today's routes so the IA win lands without the risky route migration.

export interface EstateSection {
  label: string;
  href: string;
}

/** Per-estate admin sections, keyed by estate slug (from the registry). */
export const ESTATE_ADMIN_SECTIONS: Record<string, EstateSection[]> = {
  seafields: [
    { label: "Blog", href: "/admin/estates/seafields/posts" },
    { label: "Media", href: "/admin/estates/seafields/media" },
    { label: "Stages", href: "/admin/seafields-stages" },
    { label: "Lots", href: "/admin/seafields-lots" },
    { label: "Import", href: "/admin/seafields-import" },
    { label: "Employer Campaign", href: "/admin/seafields-employer-campaign" },
  ],
  branscombe: [
    { label: "Blog", href: "/admin/estates/branscombe/posts" },
    { label: "Media", href: "/admin/estates/branscombe/media" },
    { label: "Units", href: "/admin/branscombe-units" },
  ],
  wavecrest: [
    { label: "Blog", href: "/admin/wavecrest/posts" },
    { label: "Media", href: "/admin/wavecrest/media" },
    { label: "Stages", href: "/admin/wavecrest-stages" },
    { label: "Lots", href: "/admin/wavecrest-lots" },
    { label: "Import", href: "/admin/wavecrest-import" },
  ],
  "hemp-homes": [
    { label: "Blog", href: "/admin/hemp-homes/posts" },
    { label: "Media", href: "/admin/hemp-homes/media" },
    { label: "Journey", href: "/admin/hemp-homes/journey" },
    { label: "Prospects", href: "/admin/hemp-homes/prospects" },
    { label: "Outreach", href: "/admin/hemp-homes/outreach/queue" },
  ],
  // Dutton Terrace is concept-stage: no dedicated admin pages yet. It still appears in the switcher
  // (registry-driven) with a single registrations entry, so it's never a dead end.
  "dutton-terrace": [
    { label: "Registrations", href: "/admin/registrations" },
  ],
};

export function sectionsForEstate(slug: string): EstateSection[] {
  return ESTATE_ADMIN_SECTIONS[slug] ?? [];
}
