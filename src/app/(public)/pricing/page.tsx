import Link from "next/link";

const features = [
  {
    category: "Your Estate Site",
    items: [
      "Custom branding (logo, colours, fonts)",
      "Your own domain",
      "Interactive lot map",
      "Registration of interest forms",
      "Blog & media gallery",
      "Agent portal for your team",
    ],
  },
  {
    category: "Data & Config",
    items: [
      "Unlimited lots & stages",
      "Dwelling type management",
      "Pricing bands configuration",
      "Polygon/sitemap upload",
      "Google Drive sync for media",
      "Email notifications setup",
    ],
  },
  {
    category: "Automation",
    items: [
      "AI-powered post generation",
      "Daily digest automation",
      "Waitlist management",
      "Pipeline tracking",
      "Registration analytics",
      "Email marketing integration",
    ],
  },
  {
    category: "What's Included",
    items: [
      "Your own Vercel deployment",
      "Your own Supabase database",
      "Full source code access",
      "Self-serve configuration",
      "Priority support",
      "Free demo during sales process",
    ],
  },
];

const plans = [
  {
    name: "Demo",
    price: "Free",
    description: "Try before you buy",
    features: [
      "Full platform demo",
      "Explore all features",
      "Test the admin panel",
      "See agent portal in action",
    ],
    cta: "Start Free Demo",
    href: "/seafields-estate",
    popular: false,
  },
  {
    name: "White-Label",
    price: "$399",
    period: "/month",
    description: "Your own branded instance",
    features: [
      "Everything in Demo",
      "Your own Vercel + Supabase",
      "Custom branding",
      "Full configuration access",
      "Self-serve onboarding",
      "Priority support",
    ],
    cta: "Get Started",
    href: "#purchase", // TODO: Stripe link
    popular: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Estate Sales Platform
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/seafields-estate" className="text-gray-600 hover:text-gray-900">
              Demo
            </Link>
            <Link href="/pricing" className="text-blue-600 font-medium">
              Pricing
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Sell Estate Developments
            <br />
            <span className="text-blue-600">With Your Brand</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The complete platform for land estate sales — lot selection, registrations, 
            pipeline management, and automated marketing. White-label ready for your business.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/seafields-estate"
              className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200"
            >
              View Demo
            </Link>
            <Link
              href="#purchase"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-8 ${
                  plan.popular
                    ? "ring-2 ring-blue-600 shadow-xl"
                    : "border border-gray-200"
                }`}
              >
                {plan.popular && (
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-500 mt-2">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-8 block w-full py-3 rounded-lg font-medium text-center ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((category) => (
              <div key={category.category}>
                <h3 className="font-semibold text-gray-900 mb-4">
                  {category.category}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="text-sm text-gray-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Purchase Section */}
      <section id="purchase" className="py-16 bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-8">
            Start with our free demo to explore the platform, then upgrade when you're ready.
            No credit card required for demo.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/seafields-estate"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
            >
              Try Demo First
            </Link>
            <button
              disabled
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
              title="Coming soon - contact us to purchase"
            >
              Purchase — $399/mo (Coming Soon)
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Contact us to discuss enterprise pricing or custom implementations.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-8 border-t">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Estate Sales Platform — White-label solution for property developers</p>
        </div>
      </footer>
    </div>
  );
}
