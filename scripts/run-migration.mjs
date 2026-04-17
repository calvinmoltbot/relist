import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sql = neon(process.env.DATABASE_URL);

const dir = "drizzle";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const target = process.argv[2] ?? files[files.length - 1];
const path = join(dir, target);
const content = readFileSync(path, "utf8");

console.log(`Applying ${path}:`);
console.log(content);

const statements = content
  .split(/-->\s*statement-breakpoint|;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await sql.query(stmt);
}

// Record in drizzle's migration table so future `drizzle-kit migrate` is consistent.
// (Drizzle uses __drizzle_migrations in the "drizzle" schema by default.)
try {
  const meta = readFileSync(join(dir, "meta", "_journal.json"), "utf8");
  const journal = JSON.parse(meta);
  const entry = journal.entries.find((e) => target.startsWith(e.tag) || e.tag.startsWith(target.replace(".sql", "")));
  if (entry) {
    await sql.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await sql.query(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    await sql.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [entry.tag, entry.when],
    );
    console.log("Recorded in drizzle.__drizzle_migrations:", entry.tag);
  }
} catch (e) {
  console.warn("Could not record migration in journal:", e.message);
}

console.log("Done.");
