// Run with: node --env-file=.env.local scripts/_capprobe/check-kritika.mjs
// Direct Postgres (POSTGRES_URL_NON_POOLING) — checks Kritika Bhasin's
// Seafields registration + a recent-registrations sanity check. No key printed.
import pg from "pg";

const cs =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;
if (!cs) {
  console.error("No Postgres connection string in env.");
  process.exit(1);
}
const conn = cs.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]+$/, "");
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

const mask = (e) => (e ? e.slice(0, 2) + "***@" + (e.split("@")[1] ?? "") : "—");

const hits = await client.query(
  `SELECT id, first_name, last_name, email, phone, lots_selected, interest_type, agent_id, created_at
   FROM seafields_registrations
   WHERE first_name ILIKE '%kritika%' OR last_name ILIKE '%bhasin%'
      OR email ILIKE '%bhasin%' OR first_name ILIKE '%bhasin%' OR last_name ILIKE '%kritika%'
   ORDER BY created_at DESC`,
);
console.log("=== Kritika/Bhasin matches:", hits.rows.length, "===");
for (const r of hits.rows) {
  console.log({
    name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
    email: mask(r.email),
    lots: r.lots_selected,
    interest_type: r.interest_type,
    agent_id: r.agent_id ?? "(none — NOT tagged to an agent)",
    created_at: r.created_at,
  });
}

const cnt = await client.query("SELECT count(*)::int AS n FROM seafields_registrations");
const recent = await client.query(
  `SELECT first_name, last_name, lots_selected, created_at
   FROM seafields_registrations ORDER BY created_at DESC LIMIT 6`,
);
console.log("\n=== total seafields_registrations:", cnt.rows[0].n, "===");
console.log("6 most recent (are regs saving?):");
for (const r of recent.rows)
  console.log(`  ${r.created_at?.toISOString?.() ?? r.created_at} · ${r.first_name ?? ""} ${r.last_name ?? ""} · ${JSON.stringify(r.lots_selected)}`);

await client.end();
