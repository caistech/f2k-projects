import Link from "next/link";
import type { Metadata } from "next";
import { ESTATE_BLOG_LIST } from "@/lib/estates/blog-config";

export const metadata: Metadata = {
  title: "Build Journals | Factory2Key Projects",
  description:
    "Follow our developments as they happen — build-in-public updates and photos from each Factory2Key estate.",
};

export default function BlogIndexPage() {
  return (
    <main className="bg-off-white min-h-screen">
      <section className="px-4 py-14 md:py-20" style={{ backgroundColor: "#1A2744" }}>
        <div className="max-w-[1000px] mx-auto">
          <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-white/50 mb-4">
            Build in public
          </p>
          <h1 className="font-playfair text-[clamp(2rem,4vw,3rem)] font-black text-white leading-tight mb-3">
            Build Journals
          </h1>
          <p className="text-white/70 font-archivo leading-relaxed max-w-[680px]">
            We build openly. Follow each development from concept through construction —
            updates and photos as every milestone happens. Pick an estate to follow its journey.
          </p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="max-w-[1000px] mx-auto">
          {ESTATE_BLOG_LIST.length === 0 ? (
            <p className="font-archivo text-slate/70">No journals published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {ESTATE_BLOG_LIST.map((cfg) => (
                <Link
                  key={cfg.slug}
                  href={`/blog/${cfg.slug}`}
                  className="block bg-white border border-black/10 hover:border-black/30 transition-colors p-6 no-underline group"
                >
                  <span
                    className="font-ibm-mono text-[0.55rem] tracking-[0.3em] uppercase"
                    style={{ color: cfg.accent }}
                  >
                    Build journal
                  </span>
                  <h2 className="font-playfair text-2xl font-black text-deep-blue leading-tight mt-2 mb-2 group-hover:opacity-80">
                    {cfg.name}
                  </h2>
                  <p className="font-archivo text-sm text-slate leading-relaxed">{cfg.intro}</p>
                  <span
                    className="inline-block mt-4 font-archivo text-sm border-b pb-0.5"
                    style={{ color: cfg.accent, borderColor: cfg.accent }}
                  >
                    Follow the {cfg.name} build →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
