import { redirect } from "next/navigation";

export const metadata = {
  title: "Seafields Estate — F2K Projects",
};

// Canonical short alias. The full project page lives at /seafields-estate.
// /seafields exists so marketing copy, deck links, and pattern-matching
// from sibling portfolio products land on the same page without 404.
export default function SeafieldsShortRedirect() {
  redirect("/seafields-estate");
}
