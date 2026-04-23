import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { items } from "@/db/schema";

// ---------------------------------------------------------------------------
// GET /api/inventory/thumb/[id]
//
// Serves an item's thumbnail as binary image/jpeg so the list payload can
// ship URLs instead of inline base64 (issue #42). Browser caches each thumb
// independently via strong Cache-Control + ETag, so repeat loads are free.
// ---------------------------------------------------------------------------

const DATA_URI_RE = /^data:(image\/[^;]+);base64,(.+)$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await db
    .select({ thumbnailUrl: items.thumbnailUrl })
    .from(items)
    .where(eq(items.id, id))
    .limit(1);

  const thumb = row[0]?.thumbnailUrl;
  if (!thumb) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const match = thumb.match(DATA_URI_RE);
  if (!match) {
    // Might already be an external URL — redirect through.
    if (thumb.startsWith("http")) {
      return NextResponse.redirect(thumb);
    }
    return NextResponse.json({ error: "invalid thumbnail" }, { status: 500 });
  }

  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const etag = `"${createHash("sha1").update(buffer).digest("hex")}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=604800, immutable",
      ETag: etag,
    },
  });
}
