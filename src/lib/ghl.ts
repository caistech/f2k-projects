/**
 * F2K Go High Level (GHL) CRM forwarding.
 *
 * Centralises the field mapping from F2K registrations + admin allocation
 * events into GHL contacts, so the public registration routes and the admin
 * allocation routes stay in sync.
 *
 * All forwards are best-effort: if GHL_API_KEY / GHL_LOCATION_ID are not set,
 * forwardX() functions no-op and return {skipped: true}. Callers should wrap
 * in try/catch and continue on any error so GHL outages never break the
 * primary flow (registration submission, allocation save).
 */
// @ts-expect-error — ghl-client is CommonJS, ships without types.
import { createGHLClient } from "@caistech/ghl-client";

export type Project = "branscombe" | "seafields" | "hemp-homes";

export interface RegistrationForwardPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  buyerType?: string | null;
  buyerProfile?: string | null;
  currentHousing?: string | null;
  purchaseTimeline?: string | null;
  financeStatus?: string | null;
  howHeard?: string | null;
  /** Branscombe: ["U1", "U7", ...]. Seafields: ["L240", ...]. */
  itemsSelected: string[];
  /** Map of itemId → price range string. */
  pricePreferences?: Record<string, string> | null;
  /** Seafields only — map of lotId → { primary, secondary } dwelling type. */
  dwellingPreferences?: Record<
    string,
    { primary?: string | null; secondary?: string | null }
  > | null;
  referrerType?: string | null;
  referrerName?: string | null;
  referrerCompany?: string | null;
  referrerContact?: string | null;
  notes?: string | null;
}

export interface AllocationForwardPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  /** Branscombe: "U1" etc. Seafields: "L240" etc. */
  itemId: string;
  /** Branscombe: 1..37. Seafields: 145..380 etc. */
  itemNumber: number;
  /**
   * "soft" — admin pinned the registrant as priority lead (intent-locked).
   * "firm" — admin set allocated_to (publicly Reserved).
   * "cleared" — admin removed allocation/lock.
   */
  state: "soft" | "firm" | "cleared";
  /** Free-text label from admin: dwelling type / offtaker name etc. */
  allocatedTo?: string | null;
  notes?: string | null;
}

export interface ForwardResult {
  skipped?: boolean;
  contactId?: string;
  created?: boolean;
  error?: string;
}

/** True if GHL credentials are present in env. */
export function isGHLConfigured(): boolean {
  return !!process.env.GHL_API_KEY && !!process.env.GHL_LOCATION_ID;
}

function projectTag(project: Project): string {
  switch (project) {
    case "branscombe":
      return "Branscombe Estate";
    case "seafields":
      return "Seafields Estate";
    case "hemp-homes":
      return "Hemp Homes for Eco-Communities";
  }
}

function projectSource(project: Project): string {
  switch (project) {
    case "branscombe":
      return "Branscombe ROI";
    case "seafields":
      return "Seafields ROI";
    case "hemp-homes":
      return "Hemp Homes Waitlist";
  }
}

/**
 * Map an F2K registration submission to a GHL contact upsert.
 * Tags the contact with the project + per-unit selections + buyer signals.
 */
export async function forwardRegistrationToGHL(
  payload: RegistrationForwardPayload,
  project: Project,
): Promise<ForwardResult> {
  if (!isGHLConfigured()) return { skipped: true };

  const client = createGHLClient(
    process.env.GHL_API_KEY!,
    process.env.GHL_LOCATION_ID!,
  );

  const tags: string[] = [projectTag(project), "Waitlist"];
  const itemLabel =
    project === "branscombe"
      ? "unit"
      : project === "seafields"
        ? "lot"
        : "region";
  for (const item of payload.itemsSelected) {
    tags.push(`${itemLabel}:${item}`);
  }
  if (payload.buyerType) tags.push(`Buyer: ${payload.buyerType}`);
  if (payload.financeStatus) tags.push(`Finance: ${payload.financeStatus}`);
  if (payload.purchaseTimeline)
    tags.push(`Timeline: ${payload.purchaseTimeline}`);

  const customFields = [
    { key: "project", value: projectTag(project) },
    {
      key: "items_selected",
      value: payload.itemsSelected.join(", "),
    },
    {
      key: "price_preferences",
      value: JSON.stringify(payload.pricePreferences ?? {}),
    },
    payload.dwellingPreferences &&
    Object.keys(payload.dwellingPreferences).length > 0
      ? {
          key: "dwelling_preferences",
          value: JSON.stringify(payload.dwellingPreferences),
        }
      : null,
    payload.suburb ? { key: "suburb", value: payload.suburb } : null,
    payload.postcode ? { key: "postcode", value: payload.postcode } : null,
    payload.buyerProfile
      ? { key: "buyer_profile", value: payload.buyerProfile }
      : null,
    payload.currentHousing
      ? { key: "current_housing", value: payload.currentHousing }
      : null,
    payload.howHeard ? { key: "how_heard", value: payload.howHeard } : null,
    payload.referrerName
      ? { key: "referrer_name", value: payload.referrerName }
      : null,
    payload.referrerCompany
      ? { key: "referrer_company", value: payload.referrerCompany }
      : null,
    payload.referrerType
      ? { key: "referrer_type", value: payload.referrerType }
      : null,
    payload.notes ? { key: "registration_notes", value: payload.notes } : null,
  ].filter(Boolean) as { key: string; value: unknown }[];

  try {
    const result = await client.upsertContact({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || undefined,
      source: projectSource(project),
      tags,
      customFields,
    });
    return {
      contactId: result.contact?.id,
      created: result.created,
    };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Map an admin allocation event to a GHL contact tag/custom-field update.
 * Use when soft-allocating, firm-allocating, or clearing — keeps the GHL
 * contact's status in sync with the F2K admin console.
 */
export async function forwardAllocationToGHL(
  payload: AllocationForwardPayload,
  project: Project,
): Promise<ForwardResult> {
  if (!isGHLConfigured()) return { skipped: true };

  const client = createGHLClient(
    process.env.GHL_API_KEY!,
    process.env.GHL_LOCATION_ID!,
  );

  const itemKind = project === "branscombe" ? "unit" : "lot";
  const stateTag = {
    soft: `${projectTag(project)} — Soft-Allocated`,
    firm: `${projectTag(project)} — Reserved`,
    cleared: `${projectTag(project)} — Cleared`,
  }[payload.state];

  const tags: string[] = [
    projectTag(project),
    stateTag,
    `${itemKind}:${payload.itemId}`,
  ];

  const customFields = [
    {
      key: `${project}_allocated_${itemKind}`,
      value: payload.itemId,
    },
    {
      key: `${project}_allocation_state`,
      value: payload.state,
    },
    payload.allocatedTo
      ? { key: `${project}_allocated_to`, value: payload.allocatedTo }
      : null,
    payload.notes
      ? { key: `${project}_allocation_notes`, value: payload.notes }
      : null,
  ].filter(Boolean) as { key: string; value: unknown }[];

  try {
    const result = await client.upsertContact({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || undefined,
      source: projectSource(project),
      tags,
      customFields,
    });
    return {
      contactId: result.contact?.id,
      created: result.created,
    };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
