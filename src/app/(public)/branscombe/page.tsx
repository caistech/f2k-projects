import { redirect } from "next/navigation";

export const metadata = {
  title: "Branscombe Estate — F2K Projects",
};

export default function BranscombeShortRedirect() {
  redirect("/branscombe-estate");
}
