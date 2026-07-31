"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Home-design card editor for a public estate page.
 *
 * The audience is Uwe and Lennie, not a developer: the fields are the exact strings the public card
 * renders, and each card carries a live preview of its own spec and price line so what they type is
 * what they see. Saving publishes immediately — the page reads these rows and the API busts the
 * cache tag, so there is no deploy step to wait for and no build to get wrong.
 */

interface DesignRow {
  id: string;
  estate_slug: string;
  sort_order: number;
  name: string;
  tag: string;
  beds: string;
  size: string;
  detail: string;
  hero_url: string | null;
  plan_url: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  price_from: string;
  price_label: string | null;
  is_published: boolean;
  updated_at: string;
  updated_by: string | null;
}

type Draft = {
  name: string;
  tag: string;
  beds: string;
  size: string;
  detail: string;
  hero_url: string;
  plan_url: string;
  secondary_label: string;
  secondary_href: string;
  price_from: string;
  /** Which of the three price-prefix modes is selected — see priceLabelValue(). */
  price_label_mode: "default" | "none" | "custom";
  price_label_custom: string;
  is_published: boolean;
};

const NEW_DRAFT: Draft = {
  name: "",
  tag: "",
  beds: "",
  size: "",
  detail: "",
  hero_url: "",
  plan_url: "",
  secondary_label: "",
  secondary_href: "",
  price_from: "Price on application",
  price_label_mode: "none",
  price_label_custom: "",
  is_published: true,
};

/** The gallery's default prefix when price_label is NULL — shown so the choice isn't a guess. */
const DEFAULT_PRICE_LABEL = "H&L from";

function toDraft(row: DesignRow): Draft {
  const mode: Draft["price_label_mode"] =
    row.price_label === null ? "default" : row.price_label === "" ? "none" : "custom";
  return {
    name: row.name,
    tag: row.tag ?? "",
    beds: row.beds ?? "",
    size: row.size ?? "",
    detail: row.detail ?? "",
    hero_url: row.hero_url ?? "",
    plan_url: row.plan_url ?? "",
    secondary_label: row.secondary_label ?? "",
    secondary_href: row.secondary_href ?? "",
    price_from: row.price_from,
    price_label_mode: mode,
    price_label_custom: mode === "custom" ? (row.price_label ?? "") : "",
    is_published: row.is_published,
  };
}

/** The three price-prefix modes collapse back to one column: NULL / "" / text. */
function priceLabelValue(d: Draft): string | null {
  if (d.price_label_mode === "default") return null;
  if (d.price_label_mode === "none") return "";
  return d.price_label_custom;
}

function draftToPayload(d: Draft): Record<string, unknown> {
  return {
    name: d.name,
    tag: d.tag,
    beds: d.beds,
    size: d.size,
    detail: d.detail,
    hero_url: d.hero_url,
    plan_url: d.plan_url,
    secondary_label: d.secondary_label,
    secondary_href: d.secondary_href,
    price_from: d.price_from,
    price_label: priceLabelValue(d),
    is_published: d.is_published,
  };
}

/** What the public card's price line will read, given the current draft. */
function pricePreview(d: Draft): string {
  const label =
    d.price_label_mode === "default"
      ? DEFAULT_PRICE_LABEL
      : d.price_label_mode === "none"
        ? ""
        : d.price_label_custom;
  return label ? `${label} ${d.price_from}` : d.price_from;
}

export default function EstateDesignEditor({
  estateSlug,
  estateName,
  estateHref,
}: {
  estateSlug: string;
  estateName: string;
  estateHref: string;
}) {
  const apiBase = `/api/admin/estates/${estateSlug}/designs`;

  const [rows, setRows] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(NEW_DRAFT);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to load designs" });
        return;
      }
      const list = (data.designs ?? []) as DesignRow[];
      setRows(list);
      setDrafts(Object.fromEntries(list.map((r) => [r.id, toDraft(r)])));
    } catch {
      setMessage({ type: "error", text: "Network error while loading designs" });
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  function setDraft<K extends keyof Draft>(id: string, key: K, value: Draft[K]) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  function applyRow(updated: DesignRow) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated) }));
  }

  async function patch(id: string, payload: Record<string, unknown>, note: string) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Save failed" });
        return false;
      }
      applyRow(data.design as DesignRow);
      setMessage({ type: "success", text: note });
      return true;
    } catch {
      setMessage({ type: "error", text: "Network error — nothing was saved." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveDesign(id: string) {
    const d = drafts[id];
    if (!d) return;
    if (!d.name.trim() || !d.price_from.trim()) {
      setMessage({ type: "error", text: "Design name and price are both required." });
      return;
    }
    const ok = await patch(id, draftToPayload(d), `Saved “${d.name}” — it is live now.`);
    if (ok) setOpenId(null);
  }

  async function togglePublished(row: DesignRow) {
    await patch(
      row.id,
      { is_published: !row.is_published },
      row.is_published
        ? `“${row.name}” is hidden from the public page.`
        : `“${row.name}” is showing on the public page.`,
    );
  }

  async function move(index: number, direction: -1 | 1) {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    // Swap the two sort_order values. Two PATCHes rather than one bulk call keeps the audit trail
    // one-row-per-change, matching every other admin write in this repo.
    setBusy(a.id);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${apiBase}/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: b.sort_order }),
        }),
        fetch(`${apiBase}/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: a.sort_order }),
        }),
      ]);
      if (!resA.ok || !resB.ok) {
        setMessage({ type: "error", text: "Reorder failed — the order is unchanged." });
        await load();
        return;
      }
      await load();
      setMessage({ type: "success", text: `Moved “${a.name}”.` });
    } catch {
      setMessage({ type: "error", text: "Network error during reorder." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: DesignRow) {
    const confirmed = window.confirm(
      `Delete “${row.name}” permanently?\n\n` +
        `This removes the design from the ${estateName} page and cannot be undone. ` +
        `If you only want to take it off the website for now, use Hide instead — that keeps the ` +
        `card and everything typed into it.`,
    );
    if (!confirmed) return;
    setBusy(row.id);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Delete failed" });
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setMessage({ type: "success", text: `Deleted “${row.name}”.` });
    } catch {
      setMessage({ type: "error", text: "Network error during delete." });
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!createDraft.name.trim() || !createDraft.price_from.trim()) {
      setMessage({ type: "error", text: "Design name and price are both required." });
      return;
    }
    setBusy("__create__");
    setMessage(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftToPayload(createDraft),
          // Land at the end of the gallery; the operator reorders from there.
          sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Create failed" });
        return;
      }
      setCreating(false);
      setCreateDraft(NEW_DRAFT);
      await load();
      setMessage({
        type: "success",
        text: `Added “${(data.design as DesignRow).name}”${
          createDraft.is_published ? " — it is live now." : " as hidden."
        }`,
      });
    } catch {
      setMessage({ type: "error", text: "Network error — nothing was created." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        {estateName} — Home Designs
      </h2>
      <p className="text-base text-slate-600 mb-6 max-w-3xl leading-relaxed">
        These are the home-design cards shown on the public {estateName} page. Edit the wording,
        floor areas and prices here and Save — the change appears on the website straight away, with
        no developer and no deploy. Use <strong>Hide</strong> to take a design off the site while
        keeping it here.{" "}
        <a
          href={estateHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline font-medium"
        >
          View the live page ↗
        </a>
      </p>

      {message && (
        <div
          role="status"
          className={`mb-4 p-3 rounded text-base ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setCreateDraft(NEW_DRAFT);
            setOpenId(null);
          }}
          disabled={creating}
          className="min-h-[44px] px-4 rounded bg-slate-900 text-white text-base font-semibold hover:bg-slate-700 disabled:opacity-50"
        >
          + Add a design
        </button>
      </div>

      {creating && (
        <div className="mb-6 border border-emerald-300 bg-emerald-50/40 rounded p-4 sm:p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-3">New design</h3>
          <DesignFields
            draft={createDraft}
            onChange={(k, v) => setCreateDraft((prev) => ({ ...prev, [k]: v }))}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={create}
              disabled={busy === "__create__"}
              className="min-h-[44px] px-4 rounded bg-emerald-700 text-white text-base font-semibold hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy === "__create__" ? "Adding…" : "Add design"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              disabled={busy === "__create__"}
              className="min-h-[44px] px-4 rounded border border-slate-300 bg-white text-base text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-slate-500 text-base">Loading designs…</div>
      ) : rows.length === 0 ? (
        <div className="border rounded bg-white p-6 text-base text-slate-600">
          No designs are set up for {estateName} yet. The public page is currently showing its
          built-in list — add designs here to take control of it.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, i) => {
            const draft = drafts[row.id];
            const isOpen = openId === row.id;
            return (
              <div
                key={row.id}
                className={`border rounded bg-white ${row.is_published ? "" : "opacity-70"}`}
              >
                {/* Summary line — what the public card says, at a glance. */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{row.name}</h3>
                      {row.is_published ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          ON THE WEBSITE
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          HIDDEN
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 break-words">
                      {[row.beds, row.size].filter(Boolean).join(" · ") || "No spec line set"}
                    </p>
                    <p className="text-sm text-slate-900 mt-1 font-medium break-words">
                      {draft ? pricePreview(draft) : row.price_from}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy !== null}
                      aria-label={`Move ${row.name} up`}
                      className="min-h-[44px] min-w-[44px] rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1 || busy !== null}
                      aria-label={`Move ${row.name} down`}
                      className="min-h-[44px] min-w-[44px] rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : row.id)}
                      className="min-h-[44px] px-4 rounded bg-slate-900 text-white text-base font-semibold hover:bg-slate-700"
                    >
                      {isOpen ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>

                {isOpen && draft && (
                  <div className="border-t p-4 sm:p-5 bg-slate-50/60">
                    <DesignFields
                      draft={draft}
                      onChange={(k, v) => setDraft(row.id, k, v)}
                    />
                    <div className="mt-4 flex flex-wrap gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => saveDesign(row.id)}
                        disabled={busy === row.id}
                        className="min-h-[44px] px-4 rounded bg-slate-900 text-white text-base font-semibold hover:bg-slate-700 disabled:opacity-50"
                      >
                        {busy === row.id ? "Saving…" : "Save — publish to the website"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDrafts((prev) => ({ ...prev, [row.id]: toDraft(row) }));
                          setOpenId(null);
                        }}
                        disabled={busy === row.id}
                        className="min-h-[44px] px-4 rounded border border-slate-300 bg-white text-base text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Discard changes
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePublished(row)}
                        disabled={busy === row.id}
                        className="min-h-[44px] px-4 rounded border border-slate-300 bg-white text-base text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {row.is_published ? "Hide from website" : "Show on website"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        disabled={busy === row.id}
                        className="min-h-[44px] px-4 rounded text-base text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Last changed{" "}
                      {new Date(row.updated_at).toLocaleString("en-AU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {row.updated_by ? ` by ${row.updated_by}` : ""}.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The field set, shared by the create block and each card's edit panel. */
function DesignFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const input =
    "w-full min-h-[44px] border border-slate-300 rounded px-3 py-2 text-base text-slate-900 bg-white";
  const label = "block text-sm font-semibold text-slate-700 mb-1";
  const help = "mt-1 text-xs text-slate-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="d-name">
            Design name
          </label>
          <input
            id="d-name"
            className={input}
            value={draft.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Koala"
          />
          <p className={help}>The heading on the card.</p>
        </div>
        <div>
          <label className={label} htmlFor="d-tag">
            Category label
          </label>
          <input
            id="d-tag"
            className={input}
            value={draft.tag}
            onChange={(e) => onChange("tag", e.target.value)}
            placeholder="GROH ELIGIBLE"
          />
          <p className={help}>Small label above the name. Shown in capitals.</p>
        </div>
        <div>
          <label className={label} htmlFor="d-beds">
            Bedrooms &amp; bathrooms
          </label>
          <input
            id="d-beds"
            className={input}
            value={draft.beds}
            onChange={(e) => onChange("beds", e.target.value)}
            placeholder="3 bed · 2 bath"
          />
        </div>
        <div>
          <label className={label} htmlFor="d-size">
            Size
          </label>
          <input
            id="d-size"
            className={input}
            value={draft.size}
            onChange={(e) => onChange("size", e.target.value)}
            placeholder="158m² internal · ~181m² with verandah"
          />
          <p className={help}>
            Free text — write it exactly as it should read on the website.
          </p>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="d-detail">
          Description
        </label>
        <textarea
          id="d-detail"
          rows={4}
          className={`${input} min-h-[110px]`}
          value={draft.detail}
          onChange={(e) => onChange("detail", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="d-price">
            Price
          </label>
          <input
            id="d-price"
            className={input}
            value={draft.price_from}
            onChange={(e) => onChange("price_from", e.target.value)}
            placeholder="Price on application"
          />
          <p className={help}>
            A figure like <code>$327,700</code>, or wording like{" "}
            <code>Price on application</code>.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="d-price-mode">
            Wording before the price
          </label>
          <select
            id="d-price-mode"
            className={input}
            value={draft.price_label_mode}
            onChange={(e) =>
              onChange("price_label_mode", e.target.value as Draft["price_label_mode"])
            }
          >
            <option value="default">“{DEFAULT_PRICE_LABEL}” (default)</option>
            <option value="none">Nothing — show the price on its own</option>
            <option value="custom">Something else…</option>
          </select>
          {draft.price_label_mode === "custom" && (
            <input
              className={`${input} mt-2`}
              value={draft.price_label_custom}
              onChange={(e) => onChange("price_label_custom", e.target.value)}
              placeholder="House only — from"
            />
          )}
          <p className={help}>
            The card will read: <strong>{pricePreview(draft)}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="d-hero">
            Card image
          </label>
          <input
            id="d-hero"
            className={input}
            value={draft.hero_url}
            onChange={(e) => onChange("hero_url", e.target.value)}
            placeholder="/seafields/designs/koala.png"
          />
          <p className={help}>
            Leave blank to show a “Floor plan pending” placeholder instead.
          </p>
          {draft.hero_url.trim() !== "" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={draft.hero_url}
              alt="Card image preview"
              className="mt-2 h-24 w-auto max-w-full border rounded object-contain bg-slate-100"
            />
          )}
        </div>
        <div>
          <label className={label} htmlFor="d-plan">
            Floor plan link
          </label>
          <input
            id="d-plan"
            className={input}
            value={draft.plan_url}
            onChange={(e) => onChange("plan_url", e.target.value)}
            placeholder="/seafields/designs/koala.png"
          />
          <p className={help}>
            Opened by “View plan”. Leave blank to hide that link.
          </p>
        </div>
      </div>

      <details className="border border-slate-200 rounded bg-white">
        <summary className="cursor-pointer px-3 py-3 text-base text-slate-700 min-h-[44px] flex items-center">
          Extra link (optional) — e.g. an elevations PDF
        </summary>
        <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="d-sec-label">
              Link text
            </label>
            <input
              id="d-sec-label"
              className={input}
              value={draft.secondary_label}
              onChange={(e) => onChange("secondary_label", e.target.value)}
              placeholder="Elevations"
            />
          </div>
          <div>
            <label className={label} htmlFor="d-sec-href">
              Link address
            </label>
            <input
              id="d-sec-href"
              className={input}
              value={draft.secondary_href}
              onChange={(e) => onChange("secondary_href", e.target.value)}
              placeholder="/seafields/designs/koala-elevations.pdf"
            />
          </div>
          <p className={`${help} md:col-span-2`}>
            Both boxes must be filled for the extra link to appear.
          </p>
        </div>
      </details>

      <label className="flex items-center gap-3 min-h-[44px] text-base text-slate-800">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={draft.is_published}
          onChange={(e) => onChange("is_published", e.target.checked)}
        />
        Show this design on the public website
      </label>
    </div>
  );
}
