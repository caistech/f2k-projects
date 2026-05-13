const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}
