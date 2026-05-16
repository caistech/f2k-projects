"use client";

import { useCallback, useEffect, useState } from "react";

interface EmailTemplate {
  slug: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Draft = {
  subject: string;
  html_body: string;
  text_body: string;
  description: string;
  is_active: boolean;
  reason: string;
};

function toDraft(t: EmailTemplate): Draft {
  return {
    subject: t.subject,
    html_body: t.html_body,
    text_body: t.text_body ?? "",
    description: t.description ?? "",
    is_active: t.is_active,
    reason: "",
  };
}

function diffDraft(t: EmailTemplate, d: Draft) {
  const payload: Record<string, unknown> = {};
  if (d.subject !== t.subject) payload.subject = d.subject;
  if (d.html_body !== t.html_body) payload.html_body = d.html_body;
  if ((d.text_body || null) !== (t.text_body ?? null))
    payload.text_body = d.text_body === "" ? null : d.text_body;
  if ((d.description || null) !== (t.description ?? null))
    payload.description = d.description === "" ? null : d.description;
  if (d.is_active !== t.is_active) payload.is_active = d.is_active;
  return payload;
}

const MATERIAL_KEYS = new Set(["subject", "html_body", "text_body", "is_active"]);

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to load templates" });
        return;
      }
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function startEdit(t: EmailTemplate) {
    setEditing(t.slug);
    setDraft(toDraft(t));
    setShowPreview(false);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  async function save() {
    if (!editing || !draft) return;
    const original = templates.find((t) => t.slug === editing);
    if (!original) return;

    const payload = diffDraft(original, draft);
    if (Object.keys(payload).length === 0) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }

    const touchesMaterial = Object.keys(payload).some((k) =>
      MATERIAL_KEYS.has(k),
    );
    if (touchesMaterial) {
      if (!draft.reason.trim() || draft.reason.trim().length < 10) {
        setMessage({
          type: "error",
          text: "A reason (≥10 chars) is required when changing customer-facing content.",
        });
        return;
      }
      payload.reason = draft.reason.trim();
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Save failed" });
        return;
      }
      setTemplates((prev) =>
        prev.map((t) =>
          t.slug === editing ? (data.template as EmailTemplate) : t,
        ),
      );
      setEditing(null);
      setDraft(null);
      setMessage({
        type: "success",
        text: `Updated "${editing}".`,
      });
    } catch {
      setMessage({ type: "error", text: "Network error during save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Email Templates</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-3xl">
        Resend-driven notification templates for the Seafields flows.
        Variables in <code>{`{{double_curlies}}`}</code> are interpolated with
        HTML-escaped values when the email is sent. Customer-facing content
        edits (subject, body, active toggle) require a Reason and are logged
        to the audit trail.
      </p>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-slate-500">Loading templates…</div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => {
            const isEditing = editing === t.slug;
            return (
              <div
                key={t.slug}
                className="bg-white border rounded overflow-hidden"
              >
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <div>
                    <code className="text-xs text-slate-600 font-mono">
                      {t.slug}
                    </code>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {t.subject}
                    </p>
                    {t.description && (
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.is_active ? (
                      <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-semibold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">
                        INACTIVE
                      </span>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="bg-slate-900 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs font-semibold"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-2">
                      Expects variables:{" "}
                      {t.variables.length === 0
                        ? "(none)"
                        : t.variables.map((v) => (
                            <code
                              key={v}
                              className="ml-1 bg-slate-100 px-1 py-0.5 rounded font-mono text-[0.7rem]"
                            >
                              {`{{${v}}}`}
                            </code>
                          ))}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                        Show HTML source ({t.html_body.length} chars)
                      </summary>
                      <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto whitespace-pre-wrap text-[0.7rem] font-mono max-h-64">
                        {t.html_body}
                      </pre>
                    </details>
                  </div>
                ) : (
                  draft && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={draft.subject}
                          onChange={(e) =>
                            setDraft({ ...draft, subject: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            HTML body
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPreview((p) => !p)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {showPreview ? "Hide preview" : "Show preview"}
                          </button>
                        </div>
                        <textarea
                          value={draft.html_body}
                          onChange={(e) =>
                            setDraft({ ...draft, html_body: e.target.value })
                          }
                          rows={14}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                        />
                        {showPreview && (
                          <div className="mt-2 border border-slate-300 rounded overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1 text-[0.65rem] text-slate-600 uppercase tracking-wider">
                              Preview (raw HTML, placeholders unrendered)
                            </div>
                            <iframe
                              srcDoc={draft.html_body}
                              title="Preview"
                              className="w-full h-64 bg-white"
                              sandbox=""
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                          Text body (plain-text fallback)
                        </label>
                        <textarea
                          value={draft.text_body}
                          onChange={(e) =>
                            setDraft({ ...draft, text_body: e.target.value })
                          }
                          rows={6}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                          Admin description (not sent)
                        </label>
                        <textarea
                          value={draft.description}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                          rows={2}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`is-active-${t.slug}`}
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(e) =>
                            setDraft({ ...draft, is_active: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label
                          htmlFor={`is-active-${t.slug}`}
                          className="text-sm text-slate-700"
                        >
                          Active (uncheck to disable sends without deleting)
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                          Reason for change <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={draft.reason}
                          onChange={(e) =>
                            setDraft({ ...draft, reason: e.target.value })
                          }
                          placeholder="≥10 chars — logged to audit_log alongside this change"
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t">
                        <button
                          type="button"
                          onClick={save}
                          disabled={saving}
                          className="bg-slate-900 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="text-slate-600 hover:text-slate-900 text-sm disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
