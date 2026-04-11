import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Download and resize a photo from an external URL
// Returns a data URI (base64-encoded JPEG)
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

    // Vinted embeds item data in a script tag as JSON (server-rendered state)
    // Look for photo URLs in the HTML — they use the pattern:
    // "full_size_url":"https://...vinted..." or "url":"https://images..."
    const photoUrls: string[] = [];

    // Strategy 1: Find JSON-LD or embedded data with photo URLs
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    );
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(
          /<script[^>]*>|<\/script>/gi,
          "",
        );
        try {
          const data = JSON.parse(jsonStr);
          if (data.image) {
            const images = Array.isArray(data.image)
              ? data.image
              : [data.image];
            for (const img of images) {
              const url = typeof img === "string" ? img : img?.url;
              if (url && url.startsWith("http")) {
                photoUrls.push(url);
              }
            }
          }
        } catch {
          // Not valid JSON, continue
        }
      }
    }

    // Strategy 2: Look for full_size_url patterns in embedded JS state
    const fullSizeMatches = html.matchAll(
      /"full_size_url"\s*:\s*"(https?:\/\/[^"]+)"/g,
    );
    for (const match of fullSizeMatches) {
      const url = match[1];
      if (url && !photoUrls.includes(url)) {
        photoUrls.push(url);
      }
    }

    // Strategy 3: Look for og:image meta tags
    const ogImageMatch = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    );
    if (ogImageMatch && ogImageMatch[1] && photoUrls.length === 0) {
      photoUrls.push(ogImageMatch[1]);
    }

    return photoUrls;
  } catch (error) {
    console.error("[ReList] Failed to fetch Vinted page:", pageUrl, error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// POST /api/inventory/[id]/fetch-vinted
// Fetch photos from a Vinted listing URL
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const url: string | undefined = body.url;

    // Get the item
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, id));

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const vintedUrl = url || item.vintedUrl;
    if (!vintedUrl) {
      return NextResponse.json(
        { error: "No Vinted URL provided or stored for this item" },
        { status: 400 },
      );
    }

    // Try to extract photos from the page
    const photoUrls = await extractPhotosFromVintedPage(vintedUrl);

    if (photoUrls.length === 0) {
      // Update the vintedUrl even if we couldn't get photos
      if (url && url !== item.vintedUrl) {
        await db
          .update(items)
          .set({ vintedUrl: url, updatedAt: new Date() })
          .where(eq(items.id, id));
      }

      return NextResponse.json(
        {
          error:
            "Couldn't fetch photos automatically — Vinted's anti-bot protection may be blocking the request. Try using the browser extension on this page instead.",
          vintedUrl,
        },
        { status: 422 },
      );
    }

    // Download and resize photos
    const downloadResults = await Promise.all(
      photoUrls.slice(0, 10).map((u) => downloadAndResizePhoto(u)),
    );
    const successfulPhotos = downloadResults.filter(
      (r): r is string => r !== null,
    );

    if (successfulPhotos.length === 0) {
      return NextResponse.json(
        {
          error:
            "Found photo URLs but failed to download them. Try using the browser extension instead.",
          vintedUrl,
        },
        { status: 422 },
      );
    }

    // Merge with existing photos (keep existing, add new)
    const existingPhotos = item.photoUrls ?? [];
    const allPhotos = [...existingPhotos, ...successfulPhotos];

    const [updated] = await db
      .update(items)
      .set({
        photoUrls: allPhotos,
        vintedUrl: url || item.vintedUrl,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();

    return NextResponse.json({
      item: updated,
      photosAdded: successfulPhotos.length,
    });
  } catch (error) {
    console.error("[ReList] Fetch Vinted error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Vinted" },
      { status: 500 },
    );
  }
}
