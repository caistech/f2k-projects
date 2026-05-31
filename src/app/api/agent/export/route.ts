import { NextResponse } from "next/server";
import { getAgentUser, agentCanAccessEstate } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

function buildCsvRow(row: Record<string, unknown>): string {
  return Object.values(row)
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

export async function GET() {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createSupabaseService();
  const rows: Record<string, unknown>[] = [];

  if (agentCanAccessEstate(agent, "seafields")) {
    const { data } = await (service.from("seafields_registrations") as any)
      .select("id, first_name, last_name, email, phone, lots_selected, interest_type, buyer_type, purchase_timeline, stage_name, lead_status, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });

    if (data) {
      rows.push(
        ...data.map((r: any) => ({
          Estate: "Seafields",
          "Registration ID": r.id,
          "First Name": r.first_name || "",
          "Last Name": r.last_name || "",
          Email: r.email || "",
          Phone: r.phone || "",
          "Lots Selected": (r.lots_selected || []).join(", "),
          "Interest Type": r.interest_type || "",
          "Buyer Type": r.buyer_type || "",
          "Purchase Timeline": r.purchase_timeline || "",
          Stage: r.stage_name || "",
          Status: r.lead_status || "",
          "Registered At": r.created_at ? new Date(r.created_at).toLocaleDateString("en-AU") : "",
        }))
      );
    }
  }

  if (agentCanAccessEstate(agent, "branscombe")) {
    const { data } = await (service.from("branscombe_registrations") as any)
      .select("id, first_name, last_name, email, phone, units_selected, buyer_type, purchase_timeline, stage_name, lead_status, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });

    if (data) {
      rows.push(
        ...data.map((r: any) => ({
          Estate: "Branscombe",
          "Registration ID": r.id,
          "First Name": r.first_name || "",
          "Last Name": r.last_name || "",
          Email: r.email || "",
          Phone: r.phone || "",
          "Units Selected": (r.units_selected || []).join(", "),
          "Buyer Type": r.buyer_type || "",
          "Purchase Timeline": r.purchase_timeline || "",
          Stage: r.stage_name || "",
          Status: r.lead_status || "",
          "Registered At": r.created_at ? new Date(r.created_at).toLocaleDateString("en-AU") : "",
        }))
      );
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No clients to export" }, { status: 404 });
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(buildCsvRow),
  ].join("\n");

  const filename = `my-clients-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
