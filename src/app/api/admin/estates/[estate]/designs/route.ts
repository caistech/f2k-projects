import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { estateBySlug } from "@/data/estates";
import { DESIGN_SELECT, ESTATE_DESIGNS_TAG } from "@/lib/estates/home-designs";
import { pickDesignFields } from "@/lib/estates/design-fields";

/**
 * Home-design cards for an estate's public page — list + create.
 *
 * Every write here changes a live public marketing page, so it goes through the actor-stamped
 * service client (the 0008 audit trigger records who changed what) and busts the estate-designs
 * cache tag so the change is visible immediately, without a deploy.
 */

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

async function guard(estate: string) {
  if (!estateBySlug(estate)) {
    return { error: NextResponse.json({ error: "Unknown estate" }, { status: 404 }) };
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_designs")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  const g = await guard(params.estate);
  if (g.error) return g.error;

  // Read through the actor client too, so admin reads and writes share one code path.
  const supabase = createSupabaseServiceWithActor(g.admin!.email, null);
  const { data, error } = await supabase
    .from("estate_home_designs")
    .select(DESIGN_SELECT)
    .eq("estate_slug", params.estate)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ designs: data ?? [] });
}

export async function POST(request: Request, { params }: RouteCtx) {
  const g = await guard(params.estate);
  if (g.error) return g.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { values, error: validationError } = pickDesignFields(body, { partial: false });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createSupabaseServiceWithActor(
    g.admin!.email,
    `add ${params.estate} home design "${values.name}"`,
  );
  const { data, error } = await supabase
    .from("estate_home_designs")
    .insert({
      ...values,
      estate_slug: params.estate,
      updated_by: g.admin!.email,
    })
    .select(DESIGN_SELECT)
    .single();

  if (error) {
    // The unique index is what stops a double-click creating a duplicate card on a live page —
    // report it in the operator's language rather than as a Postgres constraint string.
    const message =
      error.code === "23505"
        ? `A design called "${values.name}" already exists for this estate.`
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  revalidateTag(ESTATE_DESIGNS_TAG);
  return NextResponse.json({ design: data }, { status: 201 });
}
