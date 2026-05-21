// @explanatory-header-exempt — nested workflow page; entry-point header lives on /admin/hemp-homes
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HEMP_HOMES_STAGES,
  HEMP_HOMES_STATES,
  type HempHomesPost,
  type HempHomesStage,
  type HempHomesState,
} from "@/lib/hemp-homes/types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StageBadge({ stage }: { stage: HempHomesStage }) {
  const label = HEMP_HOMES_STAGES.find((s) => s.value === stage)?.label ?? stage;
  return (
    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
      {label}
    </span>
  );
}

function StateBadge({ state }: { state: HempHomesState }) {
  if (state === "completed") {
    return <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-semibold">Completed</span>;
  }
  if (state === "in_progress") {
    return <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">In progress</span>;
  }
  return <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">Scheduled</span>;
}

export default function HempHomesPostsPage() {
  const [posts, setPosts] = useState<HempHomesPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");
  const [stage, setStage] = useState<HempHomesStage>("design");
  const [state, setState] = useState<HempHomesState>("in_progress");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hemp-homes/posts");
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to load posts" });
        return;
      }
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setMessage({ type: "error", text: "Network error loading posts" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/hemp-homes/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, overview, stage, state }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to create" });
        return;
      }
      setMessage({ type: "success", text: `Post "${data.post.title}" created (draft).` });
      setTitle("");
      setOverview("");
      setStage("design");
      setState("in_progress");
      fetchPosts();
    } catch {
      setMessage({ type: "error", text: "Network error creating post" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Hemp Homes Posts</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Editorial posts about the Joey60 hemp design → test → build journey.
          Create a draft here; once edit + media picker + LLM email generation
          ship, you&apos;ll be able to send each post to the subscriber list capped
          at 2 emails/week.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={createPost} className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">New post</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Title
          </label>
          <input
            type="text"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            placeholder="e.g. First hemp panel sample arrived from the workshop"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Overview (markdown — source for both the public post and the LLM email)
          </label>
          <textarea
            required
            minLength={10}
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={6}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
            placeholder="Tell the story. Photos can be linked from the media library in the next iteration."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as HempHomesStage)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              {HEMP_HOMES_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as HempHomesState)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              {HEMP_HOMES_STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create draft post"}
        </button>
        <p className="text-xs text-slate-500">
          Drafts are not visible on the public page. Publishing toggle ships next.
        </p>
      </form>

      {/* List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-900">
          All posts ({posts.length})
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="p-6 text-slate-500">No posts yet. Create one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-left">Published</th>
                <th className="px-3 py-2 text-left">Email sent</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-900">{p.title}</span>
                    <span className="block text-xs text-slate-500 font-mono">{p.slug}</span>
                  </td>
                  <td className="px-3 py-2"><StageBadge stage={p.stage} /></td>
                  <td className="px-3 py-2"><StateBadge state={p.state} /></td>
                  <td className="px-3 py-2 text-xs">{p.published_at ? fmtDate(p.published_at) : <span className="text-slate-400">draft</span>}</td>
                  <td className="px-3 py-2 text-xs">{p.email_sent_at ? fmtDate(p.email_sent_at) : "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
