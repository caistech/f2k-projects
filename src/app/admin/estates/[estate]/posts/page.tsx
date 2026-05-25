import { notFound } from "next/navigation";
import { getEstateBlog } from "@/lib/estates/blog-config";
import EstatePostsAdmin from "@/components/admin/EstatePostsAdmin";

export const dynamic = "force-dynamic";

export default function EstatePostsPage({ params }: { params: { estate: string } }) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) notFound();
  return (
    <EstatePostsAdmin
      apiBase={`/api/admin/estates/${cfg.slug}`}
      estateName={cfg.name}
      mediaAdminHref={`/admin/estates/${cfg.slug}/media`}
    />
  );
}
