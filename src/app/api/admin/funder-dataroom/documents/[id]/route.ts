import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// DELETE — remove a data-room document (registry row + the stored file).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { data: doc } = await (supabase.from("funder_documents") as any)
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (doc?.storage_path) {
    await supabase.storage.from("funder-dataroom").remove([doc.storage_path]);
  }
  const { error } = await (supabase.from("funder_documents") as any).delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
