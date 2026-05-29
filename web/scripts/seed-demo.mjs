/**
 * Carrot Chase — Demo seed
 *
 * Creates a self-contained dataset for visually walking every role:
 *   • Organisation: "Hampton Primary School"
 *   • School admin user: sarah@demo.carrotchase.com / demo1234
 *   • Lead user:        james@demo.carrotchase.com  / demo1234
 *   • 4 groups (Year 5 Running Club, Year 6 Running Club, Breakfast Club, PE Class 4B)
 *   • 50 runners loaded from supabase/seed/runners.csv
 *   • Lead is assigned to Year 6 Running Club
 *   • 3 upcoming events + 2 completed (with results stubs)
 *
 * The proxy middleware exempts @demo.carrotchase.com from AAL2 (2FA), so you
 * can sign in directly without enrolling TOTP per account.
 *
 * Usage:
 *   cd web && node scripts/seed-demo.mjs
 *
 * Required env (read from web/.env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from the web/ project.
function loadDotenv() {
  const envPath = join(__dirname, "..", ".env.local");
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=\s*"?([^"]*)"?\s*$/);
      if (m) process.env[m[1]] = process.env[m[1]] ?? m[2];
    }
  } catch {
    /* fine — env might already be set */
  }
}
loadDotenv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in web/.env.local.",
  );
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ─────────────────────────────────────────────────────────────────
async function findOrCreateUser({ email, password, fullName }) {
  // Try to look up existing user by email
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;
  const existing = users.users.find((u) => u.email === email);
  if (existing) {
    console.log(`  · user exists: ${email} (${existing.id})`);
    // Reset password just to be safe
    await supabase.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  console.log(`  ✓ created user: ${email} (${data.user.id})`);
  return data.user.id;
}

async function upsertProfile({ id, fullName, email, role, orgId }) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id,
        full_name: fullName,
        email,
        role,
        organisation_id: orgId,
      },
      { onConflict: "id" },
    );
  if (error) throw error;
}

async function findOrCreateOrg({ name, type }) {
  const { data: existing } = await supabase
    .from("organisations")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("organisations")
    .insert({ name, org_type: type, status: "active", location: "London, UK" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateGroup({ name, type, orgId }) {
  const { data: existing } = await supabase
    .from("groups")
    .select("id")
    .eq("organisation_id", orgId)
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, group_type: type, organisation_id: orgId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateCourse({ name, distance, orgId }) {
  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("organisation_id", orgId)
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      name,
      distance_metres: distance,
      organisation_id: orgId,
      is_platform_preset: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = lines.shift().split(",").map((h) => h.trim());
  const rows = lines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
  return rows;
}

// ── Run ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🥕 Seeding Carrot Chase demo data…\n");

  console.log("1) Organisation");
  const orgId = await findOrCreateOrg({
    name: "Hampton Primary School",
    type: "school",
  });
  console.log(`   org id: ${orgId}\n`);

  console.log("2) Demo users");
  const schoolAdminId = await findOrCreateUser({
    email: "sarah@demo.carrotchase.com",
    password: "demo1234",
    fullName: "Sarah Mitchell",
  });
  const leadId = await findOrCreateUser({
    email: "james@demo.carrotchase.com",
    password: "demo1234",
    fullName: "James Carter",
  });
  await upsertProfile({
    id: schoolAdminId,
    fullName: "Sarah Mitchell",
    email: "sarah@demo.carrotchase.com",
    role: "school_admin",
    orgId,
  });
  await upsertProfile({
    id: leadId,
    fullName: "James Carter",
    email: "james@demo.carrotchase.com",
    role: "lead",
    orgId,
  });
  console.log();

  console.log("3) Groups");
  const groupDefs = [
    { name: "Year 5 Running Club", type: "club" },
    { name: "Year 6 Running Club", type: "club" },
    { name: "Breakfast Club", type: "breakfast_club" },
    { name: "PE Class 4B", type: "pe_class" },
  ];
  const groupIds = {};
  for (const g of groupDefs) {
    groupIds[g.name] = await findOrCreateGroup({ ...g, orgId });
    console.log(`   ✓ ${g.name}`);
  }
  console.log();

  console.log("4) Assign lead to Year 6 Running Club");
  await supabase
    .from("group_leads")
    .upsert({
      lead_id: leadId,
      group_id: groupIds["Year 6 Running Club"],
    });
  console.log();

  console.log("5) Runners from supabase/seed/runners.csv");
  const csvPath = join(__dirname, "..", "..", "supabase", "seed", "runners.csv");
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseCsv(csv);
  console.log(`   parsed ${rows.length} rows`);

  // Fetch existing runners for this org so we don't double-insert.
  const { data: existingRunners } = await supabase
    .from("runners")
    .select("full_name")
    .eq("organisation_id", orgId);
  const existingNames = new Set(
    (existingRunners ?? []).map((r) => r.full_name),
  );

  const toInsert = rows
    .filter((r) => r.full_name && !existingNames.has(r.full_name))
    .map((r) => ({
      organisation_id: orgId,
      full_name: r.full_name,
      year_group: r.year_group || null,
      current_level: 50 + Math.floor(Math.random() * 30) - 10, // 40-70
      streak_count: Math.floor(Math.random() * 8),
      personal_best_seconds: 360 + Math.floor(Math.random() * 180),
    }));

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("runners")
      .insert(toInsert)
      .select("id, full_name");
    if (error) throw error;
    console.log(`   ✓ inserted ${inserted.length} new runners`);

    // Group memberships
    const memberships = [];
    inserted.forEach((runner) => {
      const row = rows.find((r) => r.full_name === runner.full_name);
      if (row?.group_name && groupIds[row.group_name]) {
        memberships.push({
          runner_id: runner.id,
          group_id: groupIds[row.group_name],
        });
      }
    });
    if (memberships.length) {
      const { error: mErr } = await supabase
        .from("runner_groups")
        .insert(memberships);
      if (mErr) console.warn("   ! group membership warn:", mErr.message);
      else console.log(`   ✓ linked ${memberships.length} memberships`);
    }
  } else {
    console.log("   · all runners already present");
  }
  console.log();

  console.log("6) Course");
  const courseId = await findOrCreateCourse({
    name: "School Loop",
    distance: 1500,
    orgId,
  });
  console.log(`   course id: ${courseId}\n`);

  console.log("7) Events");
  const now = new Date();
  const eventDefs = [
    {
      label: "Year 6 Pursuit Run #14",
      group: "Year 6 Running Club",
      daysOffset: 1,
      status: "scheduled",
    },
    {
      label: "Year 5 Pursuit Run #12",
      group: "Year 5 Running Club",
      daysOffset: 2,
      status: "scheduled",
    },
    {
      label: "Breakfast Club Sprint #8",
      group: "Breakfast Club",
      daysOffset: 3,
      status: "scheduled",
    },
    {
      label: "Year 6 Pursuit Run #13",
      group: "Year 6 Running Club",
      daysOffset: -7,
      status: "completed",
    },
    {
      label: "PE 4B Team Relay #3",
      group: "PE Class 4B",
      daysOffset: -14,
      status: "completed",
    },
  ];
  for (const e of eventDefs) {
    const ts = new Date(now);
    ts.setDate(ts.getDate() + e.daysOffset);
    ts.setHours(15, 30, 0, 0);
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .eq("group_id", groupIds[e.group])
      .eq("scheduled_at", ts.toISOString())
      .maybeSingle();
    if (existingEvent) {
      console.log(`   · exists: ${e.label}`);
      continue;
    }
    const { error } = await supabase.from("events").insert({
      group_id: groupIds[e.group],
      course_id: courseId,
      lead_id: leadId,
      format: "handicap",
      scheduled_at: ts.toISOString(),
      status: e.status,
      term: "Spring Term 2026",
      marshals_required: 4,
    });
    if (error) console.warn(`   ! ${e.label}:`, error.message);
    else console.log(`   ✓ ${e.label}`);
  }

  console.log("\n✅ Done.\n");
  console.log("Sign in at http://localhost:3000/login as:");
  console.log("  School Admin: sarah@demo.carrotchase.com / demo1234");
  console.log("  Lead:         james@demo.carrotchase.com / demo1234");
  console.log("\n2FA is bypassed automatically for @demo.carrotchase.com.");
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
