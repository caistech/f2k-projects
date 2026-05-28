#!/usr/bin/env node
/**
 * Provision the persistent QA admin account for automated testers
 * (/naive-tester, /qa, /benchmark) per PRODUCT_STANDARDS.md §9
 * "Automated-tester auth — a real QA account, never a backdoor."
 *
 * This is NOT an auth bypass. It creates a normal, email-confirmed `owner`-tier
 * (super_admin) account that satisfies BOTH admin gates in this repo:
 *   1. Supabase auth   (auth.users — created via the service-role Admin API)
 *   2. The allowlist    (public.admin_users — role = 'super_admin')
 * Testers then either drive the real /admin/login form (Mode A) or inject a
 * real session cookie minted by cais-shared-services/scripts/qa-session.mjs
 * (Mode B). See docs/TESTING.md.
 *
 * Idempotent: re-running re-uses the existing auth user (resetting its password
 * to the freshly generated one), re-confirms email, and upserts the admin_users
 * row. Safe to run repeatedly.
 *
 * Writes QA_TEST_EMAIL + QA_TEST_PASSWORD to .env.local (gitignored) and prints
 * the password ONCE so it can be stored in the password manager. The password is
 * never committed and never written to any report.
 *
 * Usage (from repo root):
 *   node scripts/provision-qa-account.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env.local");

const QA_EMAIL = "qa@updates.corporateaisolutions.com";
const QA_ROLE = "super_admin";
const QA_NAME = "QA Tester (automated)";

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

/** Set or replace a KEY=value line in .env.local, preserving the rest. */
function upsertEnvVar(path, key, value) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const re = new RegExp(`^${key}=`);
  let found = false;
  const next = lines.map((l) => {
    if (re.test(l)) {
      found = true;
      return `${key}=${value}`;
    }
    return l;
  });
  if (!found) {
    // append before any trailing blank lines
    while (next.length && next[next.length - 1] === "") next.pop();
    next.push(`${key}=${value}`, "");
  }
  writeFileSync(path, next.join("\n"));
}

function genPassword() {
  // 24 url-safe chars, guaranteed mix; strip ambiguous chars.
  return randomBytes(24).toString("base64").replace(/[+/=]/g, "").slice(0, 24) + "9Aa!";
}

const env = parseEnv(ENV_PATH);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(email) {
  // listUsers is paginated; QA project is small, walk a few pages defensively.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const password = genPassword();

  // 1) Create or update the auth user (email-confirmed).
  let authUser = await findUserByEmail(QA_EMAIL);
  if (authUser) {
    console.log(`• auth.users: existing user found (${authUser.id}) — resetting password + confirming email`);
    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    console.log("• auth.users: creating new confirmed user");
    const { data, error } = await admin.auth.admin.createUser({
      email: QA_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: QA_NAME, qa_account: true },
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`  created ${authUser.id}`);
  }

  // 2) Upsert the allowlist row (gate 2).
  const { error: upErr } = await admin
    .from("admin_users")
    .upsert(
      { auth_user_id: authUser.id, email: QA_EMAIL, role: QA_ROLE, full_name: QA_NAME },
      { onConflict: "email" },
    );
  if (upErr) throw upErr;
  console.log(`• admin_users: upserted ${QA_EMAIL} as ${QA_ROLE}`);

  // 3) Persist creds to .env.local (gitignored) for the minter.
  upsertEnvVar(ENV_PATH, "QA_TEST_EMAIL", QA_EMAIL);
  upsertEnvVar(ENV_PATH, "QA_TEST_PASSWORD", password);
  console.log("• .env.local: wrote QA_TEST_EMAIL + QA_TEST_PASSWORD");

  console.log("\n────────────────────────────────────────────────────────");
  console.log("QA account provisioned. Store these in your password manager:");
  console.log(`  email:    ${QA_EMAIL}`);
  console.log(`  password: ${password}`);
  console.log("────────────────────────────────────────────────────────");
  console.log("(Also saved to .env.local for the session minter. Never commit it.)");
}

main().catch((e) => {
  console.error("Provisioning failed:", e.message || e);
  process.exit(1);
});
