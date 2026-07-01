import { NextResponse } from "next/server";
import { requireFunder } from "@/lib/funders/funder-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { buildFunderDemandReport, reportableEstates } from "@/lib/reports/funder-demand-report";

// GET — the estates a funder can pull a demand report for.
export async function GET() {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ estates: reportableEstates() });
}

// POST { slug } — run the funder demand report for an estate (reuses the shared reports engine).
export async function POST(request: Request) {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  const { member } = auth;

  const body = await request.json().catch(() => ({}));
  const slug = String(body?.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Choose an estate" }, { status: 400 });

  let report;
  try {
    report = await buildFunderDemandReport(slug);
  } catch (err) {
    console.error("funder report build error:", err);
    return NextResponse.json({ error: "Could not build the report" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  await (supabase.from("funder_reports") as any)
    .insert({ funder_member_id: member.id, report_type: "funder_demand", spec: { slug } })
    .then(() => {}, () => {});
  await (supabase.from("funder_dataroom_audit") as any)
    .insert({
      funder_member_id: member.id,
      action: "report_generate",
      detail: { report_type: "funder_demand", slug },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ report });
}
