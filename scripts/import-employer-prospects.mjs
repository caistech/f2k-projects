// Import the Midwest Geraldton Business list into seafields_employer_prospects.
//
// Reads the six-sector workbook, normalises each sheet's columns into the common
// schema, dedupes emailable rows by lower(email), and inserts into the LIVE f2k DB
// via the service-role key (RLS deny-by-default). Re-runnable: existing rows (by
// email, or by business_name+sector for no-email rows) are skipped, so outreach
// state set later is never clobbered.
//
// Usage:  node scripts/import-employer-prospects.mjs [--dry]
//   Connects directly to the LIVE Postgres via POSTGRES_URL_NON_POOLING from .env.local.

import XLSX from "xlsx";
import pg from "pg";
import { readFileSync } from "node:fs";

const FILE =
  "docs/Geraldton _employers/Midwest Geraldton Business - 23 March 2026.xlsx";
const SOURCE = "midwest-geraldton-business-2026-03-23";
const DRY = process.argv.includes("--dry");

// --- env (parse .env.local; prefer the direct/non-pooling connection for a script) ---
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const txt = readFileSync(".env.local", "utf8");
    const m = txt.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, "m"));
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}
const CONN = env("POSTGRES_URL_NON_POOLING") || env("POSTGRES_URL");
if (!CONN) {
  console.error("Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL in .env.local");
  process.exit(1);
}

// --- parse + normalise ---
const find = (keys, re) => keys.find((k) => re.test(k));
const wb = XLSX.readFile(FILE);
const rows = [];
for (const sn of wb.SheetNames) {
  const recs = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
  if (!recs.length) continue;
  const keys = Object.keys(recs[0]);
  const kName = find(keys, /business name/i);
  const kEmail =
    find(keys, /^email$|public email \(primary\)|^public email$/i) ||
    find(keys, /email/i);
  const kAdd = find(keys, /additional/i);
  const kSec = find(keys, /service|primary service|category|builder type/i);
  const kLoc = find(keys, /locality|area|address/i);
  const kPhone = find(keys, /phone/i);
  const kWeb = find(keys, /website|social/i);
  const kContact = find(keys, /contact person/i);
  const kOwn = find(keys, /ownership/i);
  for (const r of recs) {
    const name = String(r[kName] || "").trim();
    if (!name) continue;
    const email = String(r[kEmail] || "").trim();
    const valid = /@/.test(email) && !/\s/.test(email);
    rows.push({
      estate_slug: "seafields",
      business_name: name,
      sector: sn,
      service_desc: String(r[kSec] || "").trim() || null,
      locality: String(r[kLoc] || "").trim() || null,
      contact_person: String(r[kContact] || "").trim() || null,
      phone: String(r[kPhone] || "").trim() || null,
      email: valid ? email : null,
      additional_emails: String(r[kAdd] || "").trim() || null,
      website: String(r[kWeb] || "").trim() || null,
      ownership_basis: String(r[kOwn] || "").trim() || null,
      source: SOURCE,
      outreach_status: valid ? "imported" : "no_email",
    });
  }
}

// Dedupe emailable rows by lower(email) (keep first).
const seen = new Set();
const deduped = rows.filter((r) => {
  if (!r.email) return true;
  const k = r.email.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(
  `Parsed ${rows.length} businesses; ${deduped.length} after email-dedupe; ` +
    `${deduped.filter((r) => r.email).length} emailable, ${deduped.filter((r) => !r.email).length} without email.`,
);

if (DRY) {
  console.log("[dry run] not writing.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  // Skip rows already present (re-run safety).
  const existing = await client.query(
    "SELECT email, business_name, sector FROM public.seafields_employer_prospects",
  );
  const existEmail = new Set(
    existing.rows.filter((e) => e.email).map((e) => e.email.toLowerCase()),
  );
  const existNameSector = new Set(
    existing.rows.map((e) => `${e.business_name}||${e.sector}`),
  );
  const toInsert = deduped.filter((r) =>
    r.email
      ? !existEmail.has(r.email.toLowerCase())
      : !existNameSector.has(`${r.business_name}||${r.sector}`),
  );

  console.log(
    `Inserting ${toInsert.length} new rows (skipped ${deduped.length - toInsert.length} already present)…`,
  );

  const cols = [
    "estate_slug", "business_name", "sector", "service_desc", "locality",
    "contact_person", "phone", "email", "additional_emails", "website",
    "ownership_basis", "source", "outreach_status",
  ];
  for (const r of toInsert) {
    const vals = cols.map((c) => r[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `INSERT INTO public.seafields_employer_prospects (${cols.join(", ")}) VALUES (${ph})`,
      vals,
    );
  }

  const { rows: cnt } = await client.query(
    "SELECT count(*)::int AS n, count(email)::int AS emailable FROM public.seafields_employer_prospects",
  );
  console.log(`Done. Table now holds ${cnt[0].n} prospect rows (${cnt[0].emailable} emailable).`);
} finally {
  await client.end();
}
