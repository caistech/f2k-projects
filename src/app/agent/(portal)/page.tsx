"use client";

import { useEffect, useState } from "react";
import { useAgent, canAccess } from "@/components/agent/AgentContext";

interface Client {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lots_selected?: string[] | null;
  units_selected?: string[] | null;
  interest_type?: string | null;
  buyer_type?: string | null;
  purchase_timeline?: string | null;
  created_at: string;
}

function ClientCard({ c, estate }: { c: Client; estate: "seafields" | "branscombe" }) {
  const items =
    estate === "branscombe" ? c.units_selected || [] : c.lots_selected || [];
  const label = (id: string) =>
    estate === "branscombe"
      ? id.replace(/^U/, "Unit ")
      : id.replace(/^L/, "Lot ");
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="font-semibold text-slate-900">
        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
      </div>
      <div className="text-sm text-slate-500">{c.email}</div>
      {c.phone && <div className="text-sm text-slate-500">{c.phone}</div>}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map((l) => (
          <span
            key={l}
            className="text-xs bg-[#00B5AD]/10 text-[#00766f] px-2 py-0.5 rounded"
          >
            {label(l)}
          </span>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-2 space-y-0.5">
        {c.interest_type && <div>{c.interest_type}</div>}
        {c.buyer_type && <div>{c.buyer_type}</div>}
        {c.purchase_timeline && <div>Timeline: {c.purchase_timeline}</div>}
        <div className="text-slate-400">
          Registered {new Date(c.created_at).toLocaleDateString("en-AU")}
        </div>
      </div>
    </div>
  );
}

function ClientSection({
  title,
  clients,
  estate,
}: {
  title: string;
  clients: Client[];
  estate: "seafields" | "branscombe";
}) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {title}
      </h2>
      {clients.length === 0 ? (
        <div className="text-slate-400 text-sm border border-dashed rounded p-6 text-center">
          No clients linked to you yet. When a buyer you referred registers — or
          an admin assigns one to you — they&apos;ll appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map((c) => (
            <ClientCard key={c.id} c={c} estate={estate} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MyClientsPage() {
  const { estateAccess } = useAgent();
  const [seafields, setSeafields] = useState<Client[]>([]);
  const [branscombe, setBranscombe] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agent/my-clients");
        if (res.ok) {
          const data = await res.json();
          setSeafields(data.seafields || []);
          setBranscombe(data.branscombe || []);
        } else setError("Couldn't load your clients.");
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showSeafields = canAccess(estateAccess, "seafields");
  const showBranscombe = canAccess(estateAccess, "branscombe");
  const both = showSeafields && showBranscombe;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Clients</h1>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        The buyers registered to you. These are the registrations linked to your
        agent account — you see their full details; all other buyers stay private.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          {showSeafields && (
            <ClientSection
              title={both ? "Seafields Estate" : ""}
              clients={seafields}
              estate="seafields"
            />
          )}
          {showBranscombe && (
            <ClientSection
              title={both ? "Branscombe Estate" : ""}
              clients={branscombe}
              estate="branscombe"
            />
          )}
        </>
      )}
    </div>
  );
}
