#!/usr/bin/env node
// Phase 2 backfill — generate 200x200 thumbnails for items that don't
// have one yet. Runs locally against prod; idempotent and resumable.
//
// Usage:
//   node scripts/backfill-thumbnails.mjs --dry-run   # count + test one item
//   node scripts/backfill-thumbnails.mjs             # real run
//   node scripts/backfill-thumbnails.mjs --limit 50  # cap total processed
//
// Safety:
//   - UPDATE uses `WHERE thumbnail_url IS NULL` so concurrent writes
//     from the live app (new item ingest) never get overwritten.
//   - Selects only one photo_urls element at a time to avoid loading
//     full base64 arrays into memory.
//   - Per-item try/catch; one bad row never aborts the run.
//   - Batches with a delay + small concurrency so Neon stays healthy
//     while Lily uses the app.
//   - Ctrl-C safe — every UPDATE is independent; re-run picks up where
//     it left off via the IS NULL filter.

import { neon } from "@neondatabase/serverless";
import sharp from "sharp";
import { readFileSync } from "node:fs";

// Load .env.local if DATABASE_URL not already set.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env.local — DATABASE_URL must already be in env
  }
}

if (!process.env.DATABASE_URL) {
  console.error("[backfill] DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT_ARG = args.find((a) => a.startsWith("--limit"));
const MAX_TOTAL = LIMIT_ARG
  ? parseInt(LIMIT_ARG.split("=")[1] ?? args[args.indexOf(LIMIT_ARG) + 1], 10)
  : Infinity;

const BATCH_SIZE = 10;
const CONCURRENCY = 3;
const BATCH_DELAY_MS = 250;

function log(msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function countPending() {
  const [row] = await sql`
    SELECT count(*)::int AS n
    FROM items
    WHERE thumbnail_url IS NULL
      AND photo_urls IS NOT NULL
      AND array_length(photo_urls, 1) > 0
  `;
  return row.n;
}

async function fetchBatch(limit) {
  // Pull first photo only — arrays can be huge in bytes.
  return await sql`
    SELECT id, photo_urls[1] AS first_photo
    FROM items
    WHERE thumbnail_url IS NULL
      AND photo_urls IS NOT NULL
      AND array_length(photo_urls, 1) > 0
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${limit}
  `;
}

async function generateThumb(dataUri) {
  const m = typeof dataUri === "string"
    ? dataUri.match(/^data:image\/[^;]+;base64,(.+)$/)
    : null;
  if (!m) return { thumb: null, reason: "not-data-uri" };
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 100) return { thumb: null, reason: "too-small" };
  try {
    const thumb = await sharp(buf)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer();
    return { thumb: `data:image/jpeg;base64,${thumb.toString("base64")}` };
  } catch (err) {
    return { thumb: null, reason: `sharp: ${err.message}` };
  }
}

async function processItem(item) {
  try {
    if (!item.first_photo) return { status: "skip-no-photo" };
    const { thumb, reason } = await generateThumb(item.first_photo);
    if (!thumb) return { status: "skip-invalid", reason };
    if (DRY_RUN) return { status: "dry-ok", bytes: thumb.length };
    // Idempotent — only writes if still NULL (protects concurrent writes).
    await sql`
      UPDATE items
      SET thumbnail_url = ${thumb}
      WHERE id = ${item.id} AND thumbnail_url IS NULL
    `;
    return { status: "ok", bytes: thumb.length };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

async function runLimited(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// --- main ---
const total = await countPending();
log(`${total} items need thumbnails${DRY_RUN ? " (DRY RUN)" : ""}`);
if (total === 0) {
  log("nothing to do");
  process.exit(0);
}
if (DRY_RUN) {
  // Test the pipeline on one item, don't write.
  const [sample] = await fetchBatch(1);
  const r = await processItem(sample);
  log(`sample item ${sample.id}: ${JSON.stringify(r)}`);
  log("dry run complete — remove --dry-run to backfill");
  process.exit(0);
}

let processed = 0;
const stats = { ok: 0, "skip-no-photo": 0, "skip-invalid": 0, error: 0 };
const errors = [];
const skipReasons = {};
let totalThumbBytes = 0;

// Graceful shutdown on SIGINT — finish current batch, print stats, exit.
let stopping = false;
process.on("SIGINT", () => {
  if (stopping) process.exit(130);
  stopping = true;
  log("SIGINT — finishing current batch, press Ctrl-C again to force exit");
});

const started = Date.now();
while (processed < total && processed < MAX_TOTAL) {
  const wantedBatch = Math.min(BATCH_SIZE, MAX_TOTAL - processed);
  const batch = await fetchBatch(wantedBatch);
  if (batch.length === 0) break;

  const results = await runLimited(batch, CONCURRENCY, processItem);
  for (const r of results) {
    stats[r.status] = (stats[r.status] ?? 0) + 1;
    if (r.status === "error") errors.push(r.error);
    if (r.status === "skip-invalid" && r.reason) {
      skipReasons[r.reason] = (skipReasons[r.reason] ?? 0) + 1;
    }
    if (r.bytes) totalThumbBytes += r.bytes;
  }
  processed += batch.length;

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log(
    `${processed}/${total} ok=${stats.ok} skip=${stats["skip-no-photo"] + stats["skip-invalid"]} err=${stats.error} (${elapsed}s)`,
  );

  if (stopping) break;
  if (processed < total) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
}

log(
  `done — processed=${processed} ok=${stats.ok} skip-no-photo=${stats["skip-no-photo"]} skip-invalid=${stats["skip-invalid"]} err=${stats.error}`,
);
if (stats.ok > 0) {
  log(`avg thumb size: ${Math.round(totalThumbBytes / stats.ok)} bytes`);
}
if (Object.keys(skipReasons).length > 0) {
  log(`skip reasons: ${JSON.stringify(skipReasons)}`);
}
if (errors.length > 0) {
  log(`first errors (up to 5):`);
  for (const e of errors.slice(0, 5)) log(`  - ${e}`);
}

// Verify no leftovers if we ran to completion.
if (processed >= total && !stopping) {
  const leftover = await countPending();
  log(`verification: ${leftover} items still missing thumbnails`);
  process.exit(leftover === 0 ? 0 : 2);
}
process.exit(0);
