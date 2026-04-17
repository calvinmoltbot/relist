import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { resizePhotoBuffer } from "@/lib/photos";

// Vinted image CDN requires a Referer header; generic helper doesn't set it.
async function downloadVintedPhoto(
  url: string,
): Promise<{ full: string; thumb: string } | null> {
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
    const buffer = Buffer.from(await response.arrayBuffer());
    return await resizePhotoBuffer(buffer);
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
        photoUrls.slice(0, 10).map((u) => downloadVintedPhoto(u)),
      );
      const successful = downloadResults.filter(
        (r): r is { full: string; thumb: string } => r !== null,
      );

      if (successful.length === 0) {
        results.failed++;
        results.details.push({
          id: item.id,
          name: item.name,
          status: "download_failed",
        });
        continue;
      }

      const existingPhotos = item.photoUrls ?? [];
      const updates: Record<string, unknown> = {
        photoUrls: [...existingPhotos, ...successful.map((r) => r.full)],
        updatedAt: new Date(),
      };
      if (!item.thumbnailUrl) {
        updates.thumbnailUrl = successful[0].thumb;
      }
      await db.update(items).set(updates).where(eq(items.id, item.id));

      results.succeeded++;
      results.details.push({
        id: item.id,
        name: item.name,
        status: "success",
        photosAdded: successful.length,
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
