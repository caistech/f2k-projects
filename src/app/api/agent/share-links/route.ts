import { NextResponse } from "next/server";
import { getAgentUser } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import {
  generateAttributionToken,
  buildAgentLink,
} from "@/lib/agents/attribution-token";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://f2k-projects.vercel.app";

/**
 * GET — the logged-in agent's own tokenised attribution links, one per ROI-enabled
 * estate they cover (ROI portal, agent self-serve).
 *
 * Mints the agent's attribution_token on first view if they don't have one yet (existing
 * agents predate the column) — the SAME token the admin "Share links" button uses, so a link
 * the admin handed them and one they copy here are identical.
 *
 * Only returns estates that exist in the `estates` table (i.e. live on the ROI resolver) so we
 * never hand an agent a /r/<estate>?ref=… link that would dead-redirect (Seafields isn't on the
 * ROI spine yet).
 */
export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const service = createSupabaseService();

  // Ensure the agent has an attribution token (mint once, on demand).
  const { data: row } = await (service.from("agents") as any)
    .select("attribution_token")
    .eq("id", agent.id)
    .maybeSingle();
  let token: string = row?.attribution_token ?? "";
  if (!token) {
    token = generateAttributionToken();
    await (service.from("agents") as any)
      .update({ attribution_token: token, updated_at: new Date().toISOString() })
      .eq("id", agent.id);
  }

  // Only ROI-enabled estates (present in the estates table) that the agent covers.
  const access = Array.isArray(agent.estate_access) ? agent.estate_access : [];
  let links: { estate: string; label: string; url: string }[] = [];
  if (access.length) {
    const { data: estates } = await (service.from("estates") as any)
      .select("slug, name")
      .in("slug", access);
    links = (estates ?? []).map((e: any) => ({
      estate: e.slug,
      label: e.name as string,
      url: buildAgentLink(SITE_URL, e.slug, token),
    }));
  }

  return NextResponse.json({ links });
}
