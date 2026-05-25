/**
 * Minimal, safe markdown → HTML for short prose (blog post bodies, emails).
 *
 * Input is HTML-escaped FIRST, then a small set of inline + block rules are
 * applied, so the output is safe to render via dangerouslySetInnerHTML even
 * though our content is already operator-approved (not user-generated). Covers
 * what the post drafter produces: paragraphs, line breaks, **bold**, *italic*,
 * [links](https://…), `## headings`, and `- bullet lists`. Not a full CommonMark
 * implementation — deliberately small and dependency-free.
 */
export function renderMarkdown(md: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );

  const blocks = md.split(/\n\s*\n/);
  return blocks
    .map((raw) => {
      const t = raw.trim();
      if (!t) return "";
      const heading = t.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 4); // h1→h2 so the page h1 stays unique
        return `<h${level}>${inline(heading[2])}</h${level}>`;
      }
      const lines = t.split("\n");
      const isList = lines.every((l) => /^\s*[-*]\s+/.test(l) || l.trim() === "");
      if (isList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(t).replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
