import { Metadata } from "next";
import EmployerOnboarding from "@/components/seafields/EmployerOnboarding";

export const metadata: Metadata = {
  title: "Local employer accommodation — Seafields | Factory2Key",
  description:
    "Local employers around Seafields: secure staff accommodation by buying a house-and-land package, or reserve guaranteed beds with a take-or-pay rental commitment. Registration of interest only — not a lease or an offer.",
  // Targeted B2B capture page shared via direct outreach (mirrors the funder pages).
  robots: { index: false, follow: false },
  openGraph: {
    title: "Local employer accommodation — Seafields",
    description:
      "Stop flying your team in and out. Own a staff house-and-land package, or reserve guaranteed beds with a take-or-pay commitment.",
    url: "https://f2k-projects.vercel.app/seafields/employers",
    siteName: "Factory2Key Projects",
    type: "website",
  },
};

export default function SeafieldsEmployersPage() {
  return <EmployerOnboarding />;
}
