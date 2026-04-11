import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Download and resize a photo from an external URL
// ---------------------------------------------------------------------------
async function downloadAndResizePhoto(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.vinted.co.uk/",
      },
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const resized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64 = resized.toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("[ReList] Failed to download photo:", url, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract photo URLs from a Vinted item page
// ---------------------------------------------------------------------------
async function extractPhotosFromVintedPage(
  pageUrl: string,
): Promise<string[]> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) return [];

    const html = await response.text();
    const photoUrls: string[] = [];

    // JSON-LD
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    );
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(/<script[^>]*>|<\/script>/gi, "");
        try {
          const data = JSON.parse(jsonStr);
          if (data.image) {
            const images = Array.isArray(data.image) ? data.image : [data.image];
            for (const img of images) {
              const url = typeof img === "string" ? img : img?.url;
              if (url && url.startsWith("http")) photoUrls.push(url);
            }
          }
        } catch {
          // skip
        }
      }
    }

    // full_size_url patterns
    const fullSizeMatches = html.matchAll(
      /"full_size_url"\s*:\s*"(https?:\/\/[^"]+)"/g,
    );
    for (const match of fullSizeMatches) {
      if (match[1] && !photoUrls.includes(match[1])) {
        photoUrls.push(match[1]);
      }
    }

    // og:image fallback
    if (photoUrls.length === 0) {
      const ogMatch = html.match(
        /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      );
      if (ogMatch?.[1]) photoUrls.push(ogMatch[1]);
    }

    return photoUrls;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// POST /api/inventory/fetch-photos
// Bulk fetch photos for items with vintedUrl but no photos
// Body: { itemIds: string[] }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itemIds: string[] = body.itemIds;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds array is required" },
        { status: 400 },
      );
    }

    // Fetch items that have a vintedUrl
    const targetItems = await db
      .select()
      .from(items)
      .where(inArray(items.id, itemIds));

    const results: {
      succeeded: number;
      failed: number;
      blocked: number;
      details: Array<{ id: string; name: string; status: string; photosAdded?: number }>;
    } = { succeeded: 0, failed: 0, blocked: 0, details: [] };

    for (const item of targetItems) {
      if (!item.vintedUrl) {
        results.failed++;
        results.details.push({
          id: item.id,
          name: item.name,
          status: "no_url",
        });
        continue;
      }

      const photoUrls = await extractPhotosFromVintedPage(item.vintedUrl);

      if (photoUrls.length === 0) {
        results.blocked++;
        results.details.push({
          id: item.id,
          name: item.name,
          status: "blocked",
        });
        continue;
      }

      const downloadResults = await Promise.all(
        photoUrls.slice(0, 10).map((u) => downloadAndResizePhoto(u)),
      );
      const successfulPhotos = downloadResults.filter(
        (r): r is string => r !== null,
      );

      if (successfulPhotos.length === 0) {
        results.failed++;
        results.details.push({
          id: item.id,
          name: item.name,
          status: "download_failed",
        });
        continue;
      }

      const existingPhotos = item.photoUrls ?? [];
      await db
        .update(items)
        .set({
          photoUrls: [...existingPhotos, ...successfulPhotos],
          updatedAt: new Date(),
        })
        .where(eq(items.id, item.id));

      results.succeeded++;
      results.details.push({
        id: item.id,
        name: item.name,
        status: "success",
        photosAdded: successfulPhotos.length,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[ReList] Bulk fetch-photos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}
