import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { estateBySlug } from "@/data/estates";
import { DESIGN_SELECT } from "@/lib/estates/home-designs";
import { revalidateEstateDesigns } from "@/lib/estates/revalidate-designs";
import { pickDesignFields } from "@/lib/estates/design-fields";

/** Update or delete a single home-design card. See ../route.ts for the shared field rules. */

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string; id: string };
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

export async function PATCH(request: Request, { params }: RouteCtx) {
  const g = await guard(params.estate);
  if (g.error) return g.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Partial: a publish toggle or a reorder sends one field and must not blank the rest.
  const { values, error: validationError } = pickDesignFields(body, { partial: true });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = createSupabaseServiceWithActor(
    g.admin!.email,
    `edit ${params.estate} home design`,
  );
  const { data, error } = await supabase
    .from("estate_home_designs")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
      updated_by: g.admin!.email,
    })
    .eq("id", params.id)
    // Scoping to the estate as well as the id means a mistyped estate in the URL cannot edit
    // another estate's card.
    .eq("estate_slug", params.estate)
    .select(DESIGN_SELECT)
    .maybeSingle();

  if (error) {
    const message =
      error.code === "23505"
        ? `A design called "${values.name}" already exists for this estate.`
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  revalidateEstateDesigns(params.estate);
  return NextResponse.json({ design: data });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const g = await guard(params.estate);
  if (g.error) return g.error;

  const supabase = createSupabaseServiceWithActor(
    g.admin!.email,
    `delete ${params.estate} home design`,
  );
  const { data, error } = await supabase
    .from("estate_home_designs")
    .delete()
    .eq("id", params.id)
    .eq("estate_slug", params.estate)
    .select("id, name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  revalidateEstateDesigns(params.estate);
  return NextResponse.json({ ok: true, deleted: data });
}
