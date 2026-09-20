#!/usr/bin/env node
/**
 * CivicShield AI — demo data reset (DEVELOPMENT USE ONLY).
 *
 *   npm run demo:reset
 *
 * Resets the app's own development database (defined by DATABASE_URL in .env)
 * to a clean seeded demo state: departments, demo accounts, clearly-marked
 * DEMO complaints. Any citizen-created test data from rehearsals is removed.
 *
 * Safety guards:
 *  - Refuses to run against a non-SQLite DATABASE_URL (e.g. production
 *    Postgres/Supabase) unless `--force` is passed explicitly.
 *  - Never touches git history or files outside the project.
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";

const force = process.argv.includes("--force");

// Read DATABASE_URL from .env (simple parse; Prisma loads the same file).
let databaseUrl = process.env.DATABASE_URL;
const envPath = path.join(process.cwd(), ".env");
if (!databaseUrl && existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (m) databaseUrl = m[1].trim();
}

if (!databaseUrl) {
  console.error("✖ DATABASE_URL not found (checked environment and .env). Aborting.");
  process.exit(1);
}

const isSqlite = databaseUrl.startsWith("file:");
if (!isSqlite && !force) {
  console.error("✖ Refusing to reset: DATABASE_URL is not a local SQLite file.");
  console.error("  This guard protects remote/production databases (Supabase Postgres etc.).");
  console.error("  If you REALLY want to wipe that database, re-run with: npm run demo:reset -- --force");
  process.exit(1);
}

console.log(`Resetting demo database (${isSqlite ? "SQLite" : "NON-SQLITE — forced!"}): ${databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);

execSync("npx prisma db push --force-reset --skip-generate", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

console.log("\n✔ Demo state restored. Demo logins (clearly labeled in the UI):");
console.log("    citizen@civicshield.demo / Citizen@123");
console.log("    worker@civicshield.demo  / Worker@123");
console.log("    official@civicshield.demo / Official@123");
