import { notFound } from "next/navigation";
import { getEstateBlog } from "@/lib/estates/blog-config";
import EstateMediaLibrary from "@/components/admin/EstateMediaLibrary";

export const dynamic = "force-dynamic";

export default function EstateMediaPage({ params }: { params: { estate: string } }) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) notFound();
  return <EstateMediaLibrary apiBase={`/api/admin/estates/${cfg.slug}`} estateName={cfg.name} />;
}
