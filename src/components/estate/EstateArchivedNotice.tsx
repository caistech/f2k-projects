import Link from "next/link";

/**
 * Shown at an estate's OWN URL when an admin has archived (deactivated) it. Deliberately NOT a 404 —
 * the page still resolves; it tells the visitor the estate is no longer being marketed and sends
 * them back to the live developments, so a shared/bookmarked link never dead-ends.
 * (Toggle lives at /admin/estates.)
 */
export default function EstateArchivedNotice({ estateName }: { estateName: string }) {
  return (
    <div className="bg-off-white flex min-h-[70vh] items-center px-4 py-16">
      <div className="mx-auto max-w-[640px] border border-black/5 bg-white p-8 text-center md:p-12">
        <p className="mb-4 font-ibm-mono text-[0.65rem] uppercase tracking-[0.4em] text-ember">
          Page archived
        </p>
        <h1 className="mb-4 font-playfair text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-tight text-deep-blue">
          {estateName} is no longer being marketed
        </h1>
        <p className="mb-8 font-archivo leading-relaxed text-slate">
          This development has been archived and isn&apos;t currently open for registrations. It may
          return later. In the meantime, explore our other Factory2Key developments.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#00B5AD] px-6 py-3 font-archivo font-semibold text-white no-underline transition-colors hover:bg-[#009E97]"
        >
          See all developments →
        </Link>
      </div>
    </div>
  );
}
