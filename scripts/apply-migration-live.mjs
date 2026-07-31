// Apply one migration file to the LIVE f2k-projects Supabase via the Management API.
//
// Exists because the repo's supabase-push-migration.ps1 sources POSTGRES_URL from .env.local, which
// still carries the decommissioned Seoul connection string — pushing through it targets a dead DB.
// The Management API needs only the access token (~/.supabase-token) and takes the project ref
// explicitly, so the target can never drift silently (the CLI-link footgun this repo has been bitten
// by before: see PRODUCT_STANDARDS "verify the CLI link == the INTENDED ref").
//
// The demo Supabase is handled separately and automatically by .github/workflows/demo-db-sync.yml
// on push to main — do NOT hand-apply there.
//
// Idempotent migrations only (CREATE/ALTER ... IF [NOT] EXISTS, ON CONFLICT). Secrets never printed.
//
// Usage: node scripts/apply-migration-live.mjs supabase/migrations/0074_estate_home_designs.sql
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LIVE_REF = "zzajvnhsesqrrepflrrx"; // f2k-projects, Sydney ap-southeast-2

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration-live.mjs <path-to-migration.sql>");
  process.exit(1);
}

const token =
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_MANAGEMENT_TOKEN ||
  readFileSync(join(homedir(), ".supabase-token"), "utf8").trim();

if (!token) {
  console.error("No Supabase management token (env or ~/.supabase-token).");
  process.exit(1);
}

async function runSql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${LIVE_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`query failed ${res.status}: ${text.slice(0, 800)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const version = file.split(/[\\/]/).pop().split("_")[0];
const sql = readFileSync(file, "utf8");

console.log(`Target project ref: ${LIVE_REF} (LIVE f2k-projects, Sydney)`);
console.log(`Applying ${file} (version ${version})…`);

await runSql(sql);
console.log("SQL applied.");

// Record it so `supabase db push` and the demo sync agree on what has run.
await runSql(
  `INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('${version}', '${file.split(/[\\/]/).pop().replace(/'/g, "''")}')
   ON CONFLICT (version) DO NOTHING;`,
);
console.log(`Recorded version ${version} in supabase_migrations.schema_migrations.`);
