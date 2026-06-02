#!/usr/bin/env node
/**
 * Seed the demo environment with fictional data.
 * 
 * This script populates a demo Supabase project with realistic but fake data
 * so prospective developer clients can explore the full F2K experience.
 * 
 * Design:
 * - Scaffolding (upserted): stages, dwelling_types, lot allocations
 * - Playground (cleared + reseeded): registrations, registration_lots
 * - Demo accounts: demo-admin, demo-agent (with auth.users)
 * 
 * Usage:
 *   node scripts/seed-demo.mjs
 * 
 * Environment:
 *   DEMO_SUPABASE_URL, DEMO_SUPABASE_SERVICE_KEY (or uses .env.local defaults)
 * 
 * Idempotent: safe to run multiple times. Playground is cleared on each run.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const ENV_PATH = resolve(__dirname, "..", ".env.local");
const ENV_DEMO_PATH = resolve(__dirname, "..", ".env.demo");

let env = parseEnv(ENV_PATH);
if (!env.NEXT_PUBLIC_SUPABASE_URL) {
  env = parseEnv(ENV_DEMO_PATH);
}

const URL = process.env.DEMO_SUPABASE_URL || env.DEMO_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.DEMO_SUPABASE_SERVICE_KEY || env.DEMO_SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Missing DEMO_SUPABASE_URL or DEMO_SUPABASE_SERVICE_KEY");
  console.error("Set env vars or ensure .env.local has NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const demo = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_ADMIN_EMAIL = "demo-admin@example.com";
const DEMO_AGENT_EMAIL = "demo-agent@example.com";

function genPassword() {
  return randomBytes(20).toString("base64").replace(/[+/=]/g, "").slice(0, 20) + "9Aa!";
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await demo.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function seedScaffolding() {
  console.log("\n📦 Seeding scaffolding (stages, dwelling types, lots)...");

  // Stages - reuse same stages as production
  const stages = [
    { stage_number: 1, stage_label: "SW Block — Launch", is_open_for_registration: true, public_visible: true, rate_per_sqm: 250 },
    { stage_number: 2, stage_label: "Pepper Gate Central", is_open_for_registration: false, public_visible: true, rate_per_sqm: 275 },
    { stage_number: 3, stage_label: "Central", is_open_for_registration: false, public_visible: true, rate_per_sqm: 300 },
    { stage_number: 4, stage_label: "Pepper Gate Inner", is_open_for_registration: false, public_visible: true, rate_per_sqm: 325 },
    { stage_number: 5, stage_label: "Central Upper", is_open_for_registration: false, public_visible: true, rate_per_sqm: 350 },
    { stage_number: 6, stage_label: "Collins Road", is_open_for_registration: false, public_visible: true, rate_per_sqm: 375 },
    { stage_number: 7, stage_label: "Final Release", is_open_for_registration: false, public_visible: true, rate_per_sqm: 400 },
  ];

  for (const stage of stages) {
    const { error } = await demo.from("stages").upsert(stage, { onConflict: "stage_number" });
    if (error) console.warn("  ⚠ stages:", error.message);
  }
  console.log("  ✓ stages seeded");

  // Dwelling types
  const dwellingTypes = [
    { code: "2x2BR-ADU", plan_name: "2x2 ADU / Granny Flat", bedrooms: 2, bathrooms: 1, floor_area_sqm: 90, display_label: "2x1 ADU / Granny Flat" },
    { code: "3BR-MOD", plan_name: "3x2 Modular Home", bedrooms: 3, bathrooms: 2, floor_area_sqm: 180, display_label: "3x2 Modular Home" },
    { code: "3BR-STU-MOD", plan_name: "3x2 + Study Modular", bedrooms: 3, bathrooms: 2, floor_area_sqm: 210, display_label: "3x2 + Study Modular" },
    { code: "4BR-MOD", plan_name: "4x2 Modular Home", bedrooms: 4, bathrooms: 2, floor_area_sqm: 240, display_label: "4x2 Modular Home" },
    { code: "4BR-THE-MOD", plan_name: "4x2 + Theatre Modular", bedrooms: 4, bathrooms: 2, floor_area_sqm: 270, display_label: "4x2 + Theatre Modular" },
    { code: "5BR-MOD", plan_name: "5x2 Modular Home", bedrooms: 5, bathrooms: 2, floor_area_sqm: 300, display_label: "5x2 Modular Home" },
    { code: "DUAL-OCC", plan_name: "Dual Occupancy", bedrooms: null, bathrooms: null, floor_area_sqm: 400, display_label: "Dual Occupancy" },
  ];

  for (const dt of dwellingTypes) {
    const { error } = await demo.from("dwelling_types").upsert(dt, { onConflict: "code" });
    if (error) console.warn("  ⚠ dwelling_types:", error.message);
  }
  console.log("  ✓ dwelling_types seeded");

  // Lot allocations - use a subset of real lot numbers with fictional pricing
  // Use lots from the real Seafields but with demo pricing
  const lotNumbers = [85, 86, 87, 88, 89, 90, 91, 109, 110, 111, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 236, 237, 238, 239, 240, 250, 251, 252, 307, 308, 309, 310];
  
  for (const lotNum of lotNumbers) {
    const sqm = lotNum >= 200 && lotNum <= 235 ? 834 : lotNum >= 236 && lotNum <= 249 ? 445 : 600;
    const basePrice = 150000 + (sqm * 250); // fictional pricing
    
    const { error } = await demo.from("seafields_lot_allocations").upsert({
      lot_number: lotNum,
      sqm,
      allocated_to: null,
      dwelling_type: null,
      stage: lotNum < 250 ? "1" : "2",
      wholesale_price: basePrice * 0.8,
      retail_price: basePrice,
    }, { onConflict: "lot_number" });
    if (error) console.warn(`  ⚠ lot ${lotNum}:`, error.message);
  }
  console.log(`  ✓ ${lotNumbers.length} lots seeded`);
}

async function seedPlayground() {
  console.log("\n🧹 Clearing playground (registrations, registration_lots)...");

  // Clear in correct order (respecting foreign keys)
  await demo.from("seafields_registration_lots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await demo.from("seafields_registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  console.log("  ✓ playground cleared");

  console.log("\n📝 Seeding demo registrations...");

  // Create fake registrations with realistic-looking data
  const fakeRegistrations = [
    { first_name: "Sarah", last_name: "Mitchell", email: "sarah.mitchell@email.com", phone: "0401 234 567", lots_selected: ["L85", "L86"], price_preferences: { min: 200000, max: 350000 }, dwelling_preferences: ["3BR-MOD", "4BR-MOD"], suburb: "Geraldton", postcode: "6530", buyer_type: "owner_occupier", buyer_profile: "family", current_housing: "renting", purchase_timeline: "3-6 months", finance_status: "approved", how_heard: "google", source: "web-roi" },
    { first_name: "James", last_name: "Thompson", email: "james.t@email.com", phone: "0402 345 678", lots_selected: ["L200", "L201"], price_preferences: { min: 300000, max: 450000 }, dwelling_preferences: ["4BR-MOD", "4BR-THE-MOD"], suburb: "Perth", postcode: "6000", buyer_type: "owner_occupier", buyer_profile: "family", current_housing: "own_home", purchase_timeline: "1-3 months", finance_status: "pre-approved", how_heard: "facebook", source: "web-roi" },
    { first_name: "Emily", last_name: "Chen", email: "emily.chen@email.com", phone: "0403 456 789", lots_selected: ["L109"], price_preferences: { min: 250000, max: 400000 }, dwelling_preferences: ["3BR-MOD"], suburb: "Mount Pleasant", postcode: "6153", buyer_type: "investor", buyer_profile: "first_investor", current_housing: "renting", purchase_timeline: "6-12 months", finance_status: "arranging", how_heard: "friend_referral", source: "web-roi" },
    { first_name: "Michael", last_name: "Brown", email: "m.brown@email.com", phone: "0404 567 890", lots_selected: ["L88", "L89", "L90"], price_preferences: { min: 200000, max: 500000 }, dwelling_preferences: ["3BR-MOD", "4BR-MOD", "5BR-MOD"], suburb: "Kalgoorlie", postcode: "6430", buyer_type: "owner_occupier", buyer_profile: "growing_family", current_housing: "renting", purchase_timeline: "3-6 months", finance_status: "approved", how_heard: "signage", source: "web-roi" },
    { first_name: "Jessica", last_name: "Wilson", email: "jess.wilson@email.com", phone: "0405 678 901", lots_selected: ["L236", "L237"], price_preferences: { min: 150000, max: 250000 }, dwelling_preferences: ["2x2BR-ADU"], suburb: "Geraldton", postcode: "6530", buyer_type: "owner_occupier", buyer_profile: "retiree", current_housing: "own_home", purchase_timeline: "1-3 months", finance_status: "cash", how_heard: "newspaper", source: "web-roi" },
  ];

  const registrationIds = [];

  for (const reg of fakeRegistrations) {
    const { data, error } = await demo.from("seafields_registrations").insert({
      ...reg,
      consent: true,
    }).select().single();
    
    if (error) {
      console.warn(`  ⚠ registration ${reg.email}:`, error.message);
    } else if (data) {
      registrationIds.push(data.id);
      console.log(`  ✓ registered: ${reg.first_name} ${reg.last_name}`);
    }
  }

  // Link registrations to lots
  console.log("\n🔗 Linking registrations to lots...");
  const lotLinks = [
    { regIndex: 0, lots: [85, 86], status: "active" },
    { regIndex: 1, lots: [200, 201], status: "locked_in" },
    { regIndex: 2, lots: [109], status: "active" },
    { regIndex: 3, lots: [88, 89, 90], status: "active" },
    { regIndex: 4, lots: [236, 237], status: "active" },
  ];

  for (const link of lotLinks) {
    const regId = registrationIds[link.regIndex];
    if (!regId) continue;
    
    for (const lotNum of link.lots) {
      const { error } = await demo.from("seafields_registration_lots").insert({
        registration_id: regId,
        lot_number: lotNum,
        status: link.status,
        registration_type: "primary",
      });
      if (error) console.warn(`  ⚠ link ${lotNum}:`, error.message);
    }
  }
  console.log("  ✓ registration lots linked");
}

async function seedDemoUsers() {
  console.log("\n👤 Seeding demo accounts...");

  const adminPassword = genPassword();
  const agentPassword = genPassword();

  // Demo Admin
  let adminAuth = await findUserByEmail(DEMO_ADMIN_EMAIL);
  if (adminAuth) {
    console.log("  • demo-admin: existing user found — resetting password");
    const { data, error } = await demo.auth.admin.updateUserById(adminAuth.id, {
      password: adminPassword,
      email_confirm: true,
    });
    if (error) throw error;
    adminAuth = data.user;
  } else {
    console.log("  • demo-admin: creating new user");
    const { data, error } = await demo.auth.admin.createUser({
      email: DEMO_ADMIN_EMAIL,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Demo Admin", demo_account: true },
    });
    if (error) throw error;
    adminAuth = data.user;
    console.log(`    created ${adminAuth.id}`);
  }

  // Demo Admin in admin_users table (full_name is generated, omit it)
  const { error: adminErr } = await demo.from("admin_users").upsert({
    auth_user_id: adminAuth.id,
    email: DEMO_ADMIN_EMAIL,
    role: "super_admin",
  }, { onConflict: "email" });
  if (adminErr) console.warn("  ⚠ admin_users:", adminErr.message);
  else console.log("  ✓ demo-admin user + admin_users row");

  // Demo Agent
  let agentAuth = await findUserByEmail(DEMO_AGENT_EMAIL);
  if (agentAuth) {
    console.log("  • demo-agent: existing user found — resetting password");
    const { data, error } = await demo.auth.admin.updateUserById(agentAuth.id, {
      password: agentPassword,
      email_confirm: true,
    });
    if (error) throw error;
    agentAuth = data.user;
  } else {
    console.log("  • demo-agent: creating new user");
    const { data, error } = await demo.auth.admin.createUser({
      email: DEMO_AGENT_EMAIL,
      password: agentPassword,
      email_confirm: true,
      user_metadata: { full_name: "Demo Agent", demo_account: true },
    });
    if (error) throw error;
    agentAuth = data.user;
    console.log(`    created ${agentAuth.id}`);
  }

  // Demo Agent in agents table
  const { error: agentErr } = await demo.from("agents").upsert({
    auth_user_id: agentAuth.id,
    email: DEMO_AGENT_EMAIL,
    name: "Demo Agent",
    agency: "Demo Agency",
    estate_access: ["seafields"],
    active: true,
    status: "active",
  }, { onConflict: "email" });
  if (agentErr) console.warn("  ⚠ agents:", agentErr.message);
  else console.log("  ✓ demo-agent user + agents row");

  console.log("\n────────────────────────────────────────────────────────");
  console.log("Demo accounts ready:");
  console.log(`  Admin:  ${DEMO_ADMIN_EMAIL} / ${adminPassword}`);
  console.log(`  Agent:  ${DEMO_AGENT_EMAIL} / ${agentPassword}`);
  console.log("────────────────────────────────────────────────────────");
  console.log("(These are shared credentials for self-serve demo access)");
}

async function main() {
  console.log("🌱 Seeding F2K Demo Environment");
  console.log("==================================");
  console.log(`Target: ${URL}`);

  try {
    await seedScaffolding();
    await seedPlayground();
    await seedDemoUsers();

    console.log("\n✅ Demo seed complete!");
    console.log("\n📌 Next steps:");
    console.log("  1. Deploy this Vercel project with DEMO_MODE=true");
    console.log("  2. Add DEMO_MODE=true to the demo Vercel project's env vars");
    console.log("  3. Set up nightly cron to re-run this script");
  } catch (err) {
    console.error("\n❌ Seed failed:", err.message || err);
    process.exit(1);
  }
}

main();
