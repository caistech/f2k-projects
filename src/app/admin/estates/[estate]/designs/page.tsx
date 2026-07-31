import { notFound } from "next/navigation";
import { estateBySlug } from "@/data/estates";
import EstateDesignEditor from "@/components/admin/EstateDesignEditor";

export const dynamic = "force-dynamic";

export default function EstateDesignsPage({
  params,
}: {
  params: { estate: string };
}) {
  const estate = estateBySlug(params.estate);
  if (!estate) notFound();
  return (
    <EstateDesignEditor
      estateSlug={estate.slug}
      estateName={estate.name}
      estateHref={estate.href}
    />
  );
}
