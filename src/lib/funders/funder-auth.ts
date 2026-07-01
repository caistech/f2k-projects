import { NextResponse } from "next/server";
import { createSupabaseServer } from "../supabase-server";
import { createSupabaseService } from "../supabase-service";

export type FunderTier = "base" | "deep";

export interface FunderMember {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  firm: string | null;
  email: string;
  max_tier: FunderTier;
  deep_access_enabled: boolean;
  nda_accepted_at: string | null;
  status: string;
}

/**
 * Resolve the currently-logged-in funder member, or null. Mirrors getAgentUser(): reads the auth
 * session via the SSR client, then looks the member up with the SERVICE role (bypasses RLS).
 * Returns null unless there is a matching, ACTIVE funder_members row — so a revoked/invited-only
 * member or any non-funder auth user (admins, agents) resolves to null.
 */
export async function getFunderMember(): Promise<FunderMember | null> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createSupabaseService();
  const { data } = await (service.from("funder_members") as any)
    .select(
      "id, auth_user_id, full_name, firm, email, max_tier, deep_access_enabled, nda_accepted_at, status",
    )
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return (data as FunderMember) ?? null;
}

/** Which document tiers a member may see, given their max_tier. Deep includes base. */
export function allowedTiersFor(maxTier: FunderTier): FunderTier[] {
  return maxTier === "deep" ? ["base", "deep"] : ["base"];
}

/**
 * API-route guard: returns the member or a 403 NextResponse. Usage:
 *   const auth = await requireFunder(); if (auth instanceof NextResponse) return auth;
 *   const { member } = auth;
 */
export async function requireFunder(): Promise<
  { member: FunderMember } | NextResponse
> {
  const member = await getFunderMember();
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { member };
}
