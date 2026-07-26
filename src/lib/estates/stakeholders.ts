import { createSupabaseService } from "@/lib/supabase-service";

/**
 * Who is affected when an estate is activated or deactivated.
 *
 * Two populations, treated deliberately differently:
 *
 *   STAKEHOLDERS (agents, admins, ops/digest recipients) — internal or contracted parties who work
 *   the estate. The system emails them directly on every status change. This is service
 *   correspondence about their own access, not marketing.
 *
 *   REGISTRANTS (waitlist buyers) — the system NEVER emails them about a status change. Whether to
 *   tell a buyer their development has been pulled, how to word it, and whether to keep them on the
 *   list against a possible revival, is a commercial judgement belonging to the agent who
 *   introduced them. So each registrant is resolved to their OWNING AGENT, and that agent is given
 *   their own client list to action outside this system. Registrants with no owning agent land in
 *   an unassigned pool that is reported to admins — otherwise nobody would own telling them.
 *
 * Registrant ownership is recorded in three different shapes across the estates (the ROI spine and
 * two older per-estate patterns), so it is resolved through the CLIENT_SOURCES table below rather
 * than a query that assumes one of them.
 */

/** A registrant, as presented to the agent who owns them. */
export interface EstateClient {
  name: string;
  email: string;
  /** The table it came from — an agent with clients in two sources sees one merged list. */
  source: string;
}

export interface EstateAgentStakeholder {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  /** Registrants this agent introduced for the estate — the people THEY must contact. */
  clients: EstateClient[];
}

export interface EstateStakeholders {
  agents: EstateAgentStakeholder[];
  /** Admin + ops/digest emails, deduped, each tagged with which list it came from. */
  admins: Array<{ email: string; kind: "admin" | "notify_recipient" }>;
  /** Registrants with no introducing agent — nobody owns telling them, so admins are told. */
  unassignedClients: EstateClient[];
  /** Every registrant for the estate, assigned or not. */
  totalClients: number;
  /** Sources that could not be read (missing table/column) — surfaced, never silently dropped. */
  sourceErrors: string[];
}

/**
 * Where an estate's registrants live, and which column records the agent who introduced them.
 *
 * `agentColumn: null` means the table has no agent link at all, so every registrant in it is
 * unassigned by definition (admins own them). That is a real state, not a gap to paper over —
 * reporting them as unassigned is what gets them contacted.
 */
interface ClientSource {
  table: string;
  /** Column holding the owning agent's id, or null when the table has no agent link. */
  agentColumn: string | null;
  /** Columns joined with a space to form the registrant's display name. */
  nameColumns: string[];
  /** Restrict a shared table to this estate by a literal column value. */
  filter?: { column: string; value: string };
  /** Restrict to this estate via public.estates.slug -> estate_id (the ROI spine). */
  estateIdForSlug?: string;
}

const CLIENT_SOURCES: Record<string, ClientSource[]> = {
  seafields: [
    {
      table: "seafields_registrations",
      agentColumn: "agent_id",
      nameColumns: ["first_name", "last_name"],
    },
  ],
  branscombe: [
    // The original per-estate table (pre-ROI-portal registrations still live here)...
    {
      table: "branscombe_registrations",
      agentColumn: "agent_id",
      nameColumns: ["first_name", "last_name"],
    },
    // ...and the ROI portal spine, where Branscombe is the first tenant (migration 0062/0064).
    {
      table: "waitlist_registrations",
      agentColumn: "introducing_agent_id",
      nameColumns: ["name"],
      estateIdForSlug: "branscombe",
    },
  ],
  "dutton-terrace": [
    {
      table: "dutton_registrations",
      agentColumn: "referrer_agent_id",
      nameColumns: ["first_name", "last_name"],
    },
  ],
  wavecrest: [
    {
      table: "wavecrest_registrations",
      agentColumn: null,
      nameColumns: ["first_name", "last_name"],
    },
  ],
  "hemp-homes": [
    {
      table: "hemp_homes_waitlist",
      agentColumn: null,
      nameColumns: ["full_name"],
    },
  ],
};

/** Ops/digest recipient list per estate, where one exists. */
const NOTIFY_RECIPIENT_TABLES: Record<string, string> = {
  seafields: "seafields_notify_recipients",
  branscombe: "branscombe_notify_recipients",
  "hemp-homes": "hemp_homes_notify_recipients",
};

function displayName(row: Record<string, unknown>, columns: string[]): string {
  const parts = columns
    .map((c) => (typeof row[c] === "string" ? (row[c] as string).trim() : ""))
    .filter(Boolean);
  return parts.join(" ") || "(no name recorded)";
}

/**
 * Read one registrant source. Never throws — a source that fails (table renamed, column dropped)
 * is reported in `sourceErrors` so the operator sees an INCOMPLETE list rather than a confidently
 * short one. Silently returning zero clients here would tell an agent they have nobody to contact.
 */
async function readSource(
  supabase: ReturnType<typeof createSupabaseService>,
  source: ClientSource,
): Promise<{ rows: Array<{ agentId: string | null; client: EstateClient }>; error: string | null }> {
  try {
    const columns = Array.from(
      new Set([...source.nameColumns, "email", ...(source.agentColumn ? [source.agentColumn] : [])]),
    ).join(", ");

    let query = (supabase.from(source.table) as any).select(columns);

    if (source.filter) {
      query = query.eq(source.filter.column, source.filter.value);
    }

    if (source.estateIdForSlug) {
      const { data: estate } = await (supabase.from("estates") as any)
        .select("id")
        .eq("slug", source.estateIdForSlug)
        .maybeSingle();
      // No spine row for this estate yet => no registrants there. Not an error.
      if (!estate?.id) return { rows: [], error: null };
      query = query.eq("estate_id", estate.id);
    }

    const { data, error } = await query;
    if (error) {
      return { rows: [], error: `${source.table}: ${error.message}` };
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>)
      .filter((r) => typeof r.email === "string" && (r.email as string).includes("@"))
      .map((r) => ({
        agentId: source.agentColumn ? ((r[source.agentColumn] as string | null) ?? null) : null,
        client: {
          name: displayName(r, source.nameColumns),
          email: (r.email as string).trim(),
          source: source.table,
        },
      }));

    return { rows, error: null };
  } catch (e) {
    return {
      rows: [],
      error: `${source.table}: ${e instanceof Error ? e.message : "read threw"}`,
    };
  }
}

/**
 * Resolve every party affected by an estate status change, with each agent's own registrants
 * attached. Read-only — safe to call for the pre-toggle impact preview and again for the send.
 */
export async function collectEstateStakeholders(
  slug: string,
): Promise<EstateStakeholders> {
  const supabase = createSupabaseService();
  const sourceErrors: string[] = [];

  // --- Agents with access to this estate --------------------------------------------------
  // `active` only: a blocked agent has lost portal access, so they are no longer the person who
  // should be told to contact buyers. Their registrants fall through to the unassigned pool below.
  const { data: agentRows, error: agentErr } = await (supabase.from("agents") as any)
    .select("id, name, email, agency, estate_access, active")
    .eq("active", true)
    .contains("estate_access", [slug]);
  if (agentErr) sourceErrors.push(`agents: ${agentErr.message}`);

  const agents = new Map<string, EstateAgentStakeholder>();
  for (const a of (agentRows ?? []) as Array<{
    id: string;
    name: string | null;
    email: string | null;
    agency: string | null;
  }>) {
    if (!a.email || !a.email.includes("@")) continue;
    agents.set(a.id, {
      id: a.id,
      name: a.name || a.email,
      email: a.email.trim(),
      agency: a.agency ?? null,
      clients: [],
    });
  }

  // --- Registrants, bucketed by owning agent ----------------------------------------------
  const unassignedClients: EstateClient[] = [];
  let totalClients = 0;

  for (const source of CLIENT_SOURCES[slug] ?? []) {
    const { rows, error } = await readSource(supabase, source);
    if (error) sourceErrors.push(error);
    for (const { agentId, client } of rows) {
      totalClients++;
      const owner = agentId ? agents.get(agentId) : undefined;
      if (owner) {
        owner.clients.push(client);
      } else {
        // Either genuinely unassigned, or owned by an agent who is blocked / no longer has access
        // to this estate. Both mean the same thing operationally: an admin has to own telling them.
        unassignedClients.push(client);
      }
    }
  }

  // --- Admins + ops/digest recipients ------------------------------------------------------
  const adminEmails = new Map<string, "admin" | "notify_recipient">();

  const { data: adminRows, error: adminErr } = await (supabase.from("admin_users") as any)
    .select("email");
  if (adminErr) sourceErrors.push(`admin_users: ${adminErr.message}`);
  for (const r of (adminRows ?? []) as Array<{ email: string | null }>) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (email.includes("@")) adminEmails.set(email, "admin");
  }

  const notifyTable = NOTIFY_RECIPIENT_TABLES[slug];
  if (notifyTable) {
    const { data: notifyRows, error: notifyErr } = await (supabase.from(notifyTable) as any)
      .select("email")
      .eq("active", true);
    if (notifyErr) sourceErrors.push(`${notifyTable}: ${notifyErr.message}`);
    for (const r of (notifyRows ?? []) as Array<{ email: string | null }>) {
      const email = (r.email ?? "").trim().toLowerCase();
      // An address already in admin_users keeps the stronger 'admin' label — one email either way.
      if (email.includes("@") && !adminEmails.has(email)) {
        adminEmails.set(email, "notify_recipient");
      }
    }
  }

  return {
    agents: Array.from(agents.values()).sort((a, b) => b.clients.length - a.clients.length),
    admins: Array.from(adminEmails.entries()).map(([email, kind]) => ({ email, kind })),
    unassignedClients,
    totalClients,
    sourceErrors,
  };
}
