#!/usr/bin/env node
/**
 * Repair Supabase Auth's outbound SMTP credential — the drift that silently
 * kills every auth email (magic link + forgot password) while the app's own
 * Resend sends keep working.
 *
 * WHY THIS EXISTS
 * ---------------
 * Supabase Auth holds its OWN copy of the Resend API key (Auth → SMTP →
 * `smtp_pass`). The app holds a second copy in Vercel (`RESEND_API_KEY`).
 * Rotating the app's key does NOT update Supabase's, and nothing surfaces the
 * divergence: the app keeps emailing fine while every /otp and /recover call
 * fails 500 with
 *
 *   gomail: could not send email 1: 550 "The updates.corporateaisolutions.com
 *   domain is not verified. Please, add and verify your domain on
 *   https://resend.com/domains"
 *
 * — which does NOT mean the domain lost verification. It means the stale key
 * belongs to a DIFFERENT Resend account, one where this domain was never
 * verified. Checking DNS (which is intact) sends you the wrong way.
 *
 * Happened here on 2026-06-29 (RESEND_API_KEY rotated in Vercel, Supabase left
 * on the old account's key). Admins could still sign in with a known password,
 * so it read as "Uwe can't log in" rather than "auth email is dead", and went
 * unnoticed for a month.
 *
 * WHAT IT DOES
 * ------------
 *   1. Reads the CURRENT Resend key from the environment or .env.local.
 *   2. Verifies against the Resend API that the sending domain really is
 *      verified in THAT key's account — refuses to push a key that would fail
 *      the same way (this is the check whose absence caused the month of
 *      silence).
 *   3. PATCHes Supabase Auth `smtp_pass` via the Management API.
 *   4. Proves it worked by making Supabase actually send a magic link.
 *
 * The key is never printed, never logged, and never leaves this machine.
 *
 * Usage (from repo root):
 *   node scripts/repair-auth-smtp.mjs --check          # steps 1-2 only, no writes
 *   node scripts/repair-auth-smtp.mjs                  # full repair + verify
 *   node scripts/repair-auth-smtp.mjs --probe you@x.com
 *
 * Reads RESEND_API_KEY from the shell env, else .env.local.
 * Reads the Supabase management token from SUPABASE_MANAGEMENT_TOKEN /
 * SUPABASE_ACCESS_TOKEN, else ~/.supabase-token.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env.local");

const PROJECT_REF = "zzajvnhsesqrrepflrrx"; // f2k-projects, Sydney
const SENDING_DOMAIN = "updates.corporateaisolutions.com";
const DEFAULT_PROBE = "dennis+qaadmin@factory2key.com.au";

/**
 * Abort with a message. Throws rather than calling process.exit(): exiting
 * while a fetch keep-alive handle is still open trips a libuv assertion on
 * Windows, which would make a successful run report a bogus exit 127.
 */
class Abort extends Error {}
function die(message) {
  throw new Abort(message);
}

function parseEnv(path) {
  const out = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
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

function resolveResendKey() {
  const key = process.env.RESEND_API_KEY || parseEnv(ENV_PATH).RESEND_API_KEY;
  if (!key) {
    die(
      `No RESEND_API_KEY in the shell env or ${ENV_PATH}.\n` +
        `  Pull it with: vercel env pull .env.local  (or export it in this shell).`,
    );
  }
  return key;
}

function resolveManagementToken() {
  const fromEnv =
    process.env.SUPABASE_MANAGEMENT_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(join(homedir(), ".supabase-token"), "utf8").trim();
  } catch {
    return die("No Supabase management token (env or ~/.supabase-token).");
  }
}

/**
 * Step 2 — the load-bearing guard. A key that authenticates fine but belongs to
 * an account without this domain fails at SEND time with a 550, which is
 * invisible until a user tries to log in. Refuse it here instead.
 */
async function assertDomainVerifiedForKey(resendKey) {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (res.status === 401 || res.status === 403) {
    die(`Resend rejected this key (HTTP ${res.status}). It is revoked or malformed.`);
  }
  const body = await res.json();
  const list = body.data ?? body;
  if (!Array.isArray(list)) {
    die(`Unexpected Resend /domains response: ${JSON.stringify(body).slice(0, 200)}`);
  }

  console.log("Domains visible to this key:");
  for (const d of list) console.log(`  ${d.name} — ${d.status} (${d.region ?? "?"})`);

  const target = list.find((d) => d.name === SENDING_DOMAIN);
  if (!target) {
    die(
      `${SENDING_DOMAIN} is NOT in this key's Resend account.\n` +
        `  This is the exact failure being repaired — pushing this key would reproduce it.\n` +
        `  Use a key from the account that owns the verified domain.`,
    );
  }
  if (target.status !== "verified") {
    die(
      `${SENDING_DOMAIN} is present but status="${target.status}", not "verified". Fix DNS first.`,
    );
  }
  console.log(`\n✓ ${SENDING_DOMAIN} is verified in this key's account — safe to push.`);
}

async function pushSmtpConfig(mgmtToken, resendKey) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${mgmtToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_email_enabled: true,
      smtp_host: "smtp.resend.com",
      smtp_port: "465",
      smtp_user: "resend",
      smtp_pass: resendKey,
      smtp_admin_email: `noreply@${SENDING_DOMAIN}`,
      smtp_sender_name: "F2K Projects",
    }),
  });
  if (!res.ok) {
    die(`Supabase config PATCH failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  console.log("✓ Supabase Auth smtp_pass updated.");
}

/**
 * Step 4 — make Supabase itself send. A 200 means GoTrue handed the message to
 * Resend and Resend accepted it. "Config saved" on its own is what let this rot
 * for a month, so the repair is not reported as done without a real send.
 */
async function verifyBySending(mgmtToken, probeEmail) {
  const keysRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } },
  );
  const keys = await keysRes.json();
  const anon = Array.isArray(keys) ? keys.find((k) => k.name === "anon")?.api_key : null;
  if (!anon) die("Could not resolve the anon key to run the send verification.");

  await new Promise((r) => setTimeout(r, 3000)); // let the config roll out

  const res = await fetch(`https://${PROJECT_REF}.supabase.co/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: probeEmail, create_user: false }),
  });
  const body = await res.text();

  if (!res.ok) {
    die(
      `Config was written but the send still failed: HTTP ${res.status}\n` +
        `  ${body.slice(0, 300)}\n` +
        `  If this is 429, the per-address 60s throttle is in play — re-run with --probe <other address>.`,
    );
  }
  console.log(`\n✓ VERIFIED — Supabase sent a magic link to ${probeEmail}.`);
  console.log(
    "  Magic link and forgot-password are live again. Check that inbox to confirm delivery.",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const probeEmail = args[args.indexOf("--probe") + 1] || DEFAULT_PROBE;

  const resendKey = resolveResendKey();
  console.log(`Resend key: found (${resendKey.length} chars, prefix ${resendKey.slice(0, 3)}…)`);

  await assertDomainVerifiedForKey(resendKey);

  if (checkOnly) {
    console.log("\n--check: stopping before any write.");
    return;
  }

  const mgmtToken = resolveManagementToken();
  await pushSmtpConfig(mgmtToken, resendKey);
  await verifyBySending(mgmtToken, probeEmail);
}

try {
  await main();
} catch (err) {
  if (err instanceof Abort) {
    console.error(`\n✗ ${err.message}`);
    process.exitCode = 1;
  } else {
    throw err;
  }
}
