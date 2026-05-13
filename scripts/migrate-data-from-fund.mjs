#!/usr/bin/env node
/**
 * Migrate purchaser data from fund Supabase → new F2K-Projects Supabase.
 *
 * Tables migrated (in order — registrations first, then allocations because
 * intent_locked_to_registration_id FKs registration IDs):
 *   - seafields_registrations
 *   - branscombe_registrations
 *   - hemp_homes_waitlist
 *   - seafields_lot_allocations  (live state replaces seed)
 *   - branscombe_unit_allocations (live state replaces seed)
 *
 * NOT migrated: audit_log (each site keeps its own action history).
 *
 * Idempotent — upserts on primary keys. Safe to re-run as a backfill at
 * cutover for any rows that arrived after the first dump.
 *
 * Usage (from F2K-Projects root):
 *   node scripts/migrate-data-from-fund.mjs
 *
 * Reads:
 *   - .env.local (new Supabase keys: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *   - ../F2K-Fund-Tokenisation/.env.local (fund Supabase keys: same names)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEW_ENV = resolve(__dirname, "..", ".env.local");
const FUND_ENV = resolve(__dirname, "..", "..", "F2K-Fund-Tokenisation", ".env.local");

function parseEnv(path) {
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const fundEnv = parseEnv(FUND_ENV);
const newEnv = parseEnv(NEW_ENV);

const FUND_URL = fundEnv.NEXT_PUBLIC_SUPABASE_URL;
const FUND_KEY = fundEnv.SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = newEnv.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = newEnv.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ FUND_URL, FUND_KEY, NEW_URL, NEW_KEY })) {
  if (!v) {
    console.error(`Missing ${k}. Check both .env.local files.`);
    process.exit(1);
  }
}

console.log(`Source: ${FUND_URL.replace(/^https?:\/\//, "")}`);
console.log(`Target: ${NEW_URL.replace(/^https?:\/\//, "")}`);
console.log();

const fund = createClient(FUND_URL, FUND_KEY, { auth: { persistSession: false } });
const proj = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Columns that FK to fund-side auth.users — strip them on migration since
// admin auth users are re-created fresh on the new Supabase project.
const STRIP_COLUMNS = {
  seafields_lot_allocations: ["assigned_by", "intent_locked_by"],
  branscombe_unit_allocations: ["assigned_by", "intent_locked_by"],
};

async function migrate(table, opts = {}) {
  const { conflictKey = "id", optional = false, pageSize = 1000 } = opts;
  const strip = STRIP_COLUMNS[table] ?? [];
  let total = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await fund
      .from(table)
      .select("*")
      .order(conflictKey, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      if (optional && /relation .* does not exist|not found/i.test(error.message)) {
        console.log(`  ${table}: (table missing on fund — skipped)`);
        return 0;
      }
      throw new Error(`fund.${table} fetch: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    // Scrub FKs that don't map across projects
    const scrubbed = data.map((row) => {
      const copy = { ...row };
      for (const col of strip) copy[col] = null;
      return copy;
    });
    const { error: upErr } = await proj
      .from(table)
      .upsert(scrubbed, { onConflict: conflictKey });
    if (upErr) {
      throw new Error(`proj.${table} upsert: ${upErr.message}`);
    }
    total += data.length;
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return total;
}

async function countBoth(table) {
  const [{ count: fc }, { count: nc }] = await Promise.all([
    fund.from(table).select("*", { count: "exact", head: true }),
    proj.from(table).select("*", { count: "exact", head: true }),
  ]);
  return { fund: fc ?? 0, proj: nc ?? 0 };
}

const tables = [
  { name: "seafields_registrations", conflictKey: "id" },
  { name: "branscombe_registrations", conflictKey: "id" },
  { name: "hemp_homes_waitlist", conflictKey: "id", optional: true },
  { name: "seafields_lot_allocations", conflictKey: "lot_number" },
  { name: "branscombe_unit_allocations", conflictKey: "unit_number" },
];

console.log("=== Before migration ===");
for (const t of tables) {
  try {
    const c = await countBoth(t.name);
    console.log(`  ${t.name.padEnd(32)} fund=${String(c.fund).padStart(4)}  proj=${c.proj}`);
  } catch (e) {
    console.log(`  ${t.name.padEnd(32)} (count failed: ${e.message})`);
  }
}

console.log();
console.log("=== Migrating ===");
for (const t of tables) {
  try {
    const n = await migrate(t.name, t);
    console.log(`  ${t.name.padEnd(32)} → ${n} rows upserted`);
  } catch (e) {
    console.error(`  ${t.name.padEnd(32)} FAILED: ${e.message}`);
  }
}

console.log();
console.log("=== After migration ===");
for (const t of tables) {
  try {
    const c = await countBoth(t.name);
    const match = c.fund === c.proj ? "✓" : "✗";
    console.log(`  ${t.name.padEnd(32)} fund=${String(c.fund).padStart(4)}  proj=${String(c.proj).padStart(4)}  ${match}`);
  } catch (e) {
    console.log(`  ${t.name.padEnd(32)} (count failed: ${e.message})`);
  }
}
console.log();
console.log("Done.");
