import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Factory2Key Projects",
  description:
    "How Factory2Key Pty Ltd collects, uses, and protects information you provide when registering interest in a Factory2Key residential development.",
};

export default function PrivacyPage() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-[800px] mx-auto prose-sm font-archivo text-slate">
        <p className="font-ibm-mono text-[0.65rem] tracking-[0.4em] uppercase text-ember mb-3">
          Privacy
        </p>
        <h1 className="font-playfair text-[2.2rem] font-black text-deep-blue leading-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate/60 mb-8">
          Last updated: 13 May 2026
        </p>

        <div className="space-y-6 text-slate leading-relaxed">
          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              1. Who we are
            </h2>
            <p>
              This site is operated by Factory2Key Pty Ltd (ACN to be inserted),
              an Australian proprietary company. References to &ldquo;we&rdquo;,
              &ldquo;us&rdquo; and &ldquo;our&rdquo; in this policy refer to
              Factory2Key Pty Ltd.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              2. What this site does
            </h2>
            <p>
              This site lists residential developments Factory2Key is delivering
              and allows prospective purchasers to register a non-binding
              interest in a specific lot or home. No deposit is taken on this
              site. No financial product is offered or promoted on this site.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              3. What we collect
            </h2>
            <p>
              When you submit a registration of interest we collect: your name,
              email address, optional phone number, current suburb and
              postcode, the lots or homes you have indicated interest in, and
              any optional information you choose to share about your
              circumstances (buyer type, timeline, finance status, referrer
              details, free-text notes).
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              4. How we use it
            </h2>
            <p>
              We use the information solely to: (a) confirm receipt of your
              registration, (b) keep you informed about the specific development
              you registered for, (c) contact you when contracts of sale become
              available for the lot or home you indicated. We do not use your
              information for any purpose unrelated to the development you
              registered for.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              5. Who we share it with
            </h2>
            <p>
              Your registration data is stored in our customer relationship
              system (provided by LeadConnector / GHL) and a private Supabase
              database operated by Factory2Key. We do not sell, rent, or
              transfer your information to third parties for marketing.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              6. Your rights
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              registration at any time by emailing{" "}
              <a
                href="mailto:dennis@factory2key.com.au"
                className="text-[#00B5AD] underline"
              >
                dennis@factory2key.com.au
              </a>
              . You may also withdraw your registration at any time.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              7. Cookies and analytics
            </h2>
            <p>
              This site does not use third-party tracking cookies. It uses
              only the technical cookies required to load the page.
            </p>
          </section>

          <section>
            <h2 className="font-archivo font-bold text-deep-blue text-lg mb-2">
              8. Contact
            </h2>
            <p>
              Privacy questions: Dennis McMahon,{" "}
              <a
                href="mailto:dennis@factory2key.com.au"
                className="text-[#00B5AD] underline"
              >
                dennis@factory2key.com.au
              </a>
              , +61 402 612 471.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
