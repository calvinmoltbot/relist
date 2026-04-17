import sharp from "sharp";

// Full-size: 1200x1200 JPEG q70, ~200-400 KB. Used for detail views.
// Thumbnail: 200x200 JPEG q60, ~10-20 KB. Used for list cards.
// Keep both as base64 data URIs so they travel in the existing photoUrls
// text[] column and the new thumbnail_url text column without needing a
// blob store.

export async function resizePhotoBuffer(
  buffer: Buffer,
): Promise<{ full: string; thumb: string }> {
  const [fullBuf, thumbBuf] = await Promise.all([
    sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer(),
    sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer(),
  ]);

  return {
    full: `data:image/jpeg;base64,${fullBuf.toString("base64")}`,
    thumb: `data:image/jpeg;base64,${thumbBuf.toString("base64")}`,
  };
}

export async function downloadAndResizePhoto(
  url: string,
): Promise<{ full: string; thumb: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

// Derive a thumbnail from an existing base64 data URI (e.g. photoUrls[0]
// from a client-side upload or legacy row without a thumb).
export async function thumbnailFromDataUri(
  dataUri: string,
): Promise<string | null> {
  try {
    const match = dataUri.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!match) return null;
    const buffer = Buffer.from(match[1], "base64");
    const thumbBuf = await sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer();
    return `data:image/jpeg;base64,${thumbBuf.toString("base64")}`;
  } catch (error) {
    console.error("[ReList] Failed to generate thumbnail:", error);
    return null;
  }
}
