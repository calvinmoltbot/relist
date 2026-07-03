import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL is not set — skipping migrations.");
  process.exit(0);
}

const db = drizzle(neon(url));

console.log("Applying pending migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations up to date.");
