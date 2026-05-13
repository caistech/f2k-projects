import ProjectsHeader from "@/components/ProjectsHeader";
import ProjectsFooter from "@/components/ProjectsFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      <ProjectsHeader />
      <main className="flex-1">{children}</main>
      <ProjectsFooter />
    </div>
  );
}
