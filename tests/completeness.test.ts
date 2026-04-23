import { describe, it, expect } from "vitest";
import { scoreItem, summarise, WEIGHTS } from "@/lib/inventory/completeness";

function fullItem() {
  return {
    name: "vintage navy pinstripe blazer",
    brand: "Zara",
    category: "Blazers",
    size: "M / UK 12",
    description:
      "Classic navy pinstripe blazer with satin lining. Runs slightly boxy — suits a size up. Great over a tee.",
    photoUrls: ["a", "b", "c", "d"],
    vintedUrl: "https://www.vinted.co.uk/items/123-navy-blazer",
  };
}

describe("scoreItem", () => {
  it("scores a fully complete listing at 100", () => {
    const r = scoreItem(fullItem());
    expect(r.score).toBe(100);
    expect(r.band).toBe("green");
    expect(r.missing).toHaveLength(0);
  });

  it("scores an empty listing at 0", () => {
    const r = scoreItem({
      name: "",
      brand: null,
      category: null,
      size: null,
      description: null,
      photoUrls: null,
      vintedUrl: null,
    });
    expect(r.score).toBe(0);
    expect(r.band).toBe("red");
    expect(r.missing).toHaveLength(7);
  });

  it("applies the brand weight", () => {
    const item = { ...fullItem(), brand: null };
    expect(scoreItem(item).score).toBe(100 - WEIGHTS.brand);
  });

  it("applies the category weight", () => {
    const item = { ...fullItem(), category: null };
    expect(scoreItem(item).score).toBe(100 - WEIGHTS.category);
  });

  it("applies the vintedUrl weight", () => {
    const item = { ...fullItem(), vintedUrl: null };
    expect(scoreItem(item).score).toBe(100 - WEIGHTS.vintedUrl);
  });

  it("requires 40+ char description", () => {
    const short = { ...fullItem(), description: "too short" };
    expect(scoreItem(short).score).toBe(100 - WEIGHTS.description);
  });

  it("requires at least 3 photos", () => {
    const two = { ...fullItem(), photoUrls: ["a", "b"] };
    expect(scoreItem(two).score).toBe(100 - WEIGHTS.photos);
  });

  it("requires 4+ word title", () => {
    const shortTitle = { ...fullItem(), name: "blue blazer" };
    expect(scoreItem(shortTitle).score).toBe(100 - WEIGHTS.title);
  });

  it("sorts missing fields by weight desc", () => {
    const r = scoreItem({
      name: "x",
      brand: null,
      category: null,
      size: null,
      description: null,
      photoUrls: null,
      vintedUrl: null,
    });
    // Highest weight missing first (20 tied → stable order acceptable)
    expect(r.missing[0].weight).toBeGreaterThanOrEqual(r.missing[1].weight);
    expect(r.missing[r.missing.length - 1].weight).toBe(WEIGHTS.vintedUrl);
  });

  it("bands: red <50, amber 50-79, green ≥80", () => {
    // Remove 50% of weight (photos 20 + description 20 + title 10 = 50)
    const r = scoreItem({
      ...fullItem(),
      description: "short",
      photoUrls: [],
      name: "one",
    });
    expect(r.score).toBe(50);
    expect(r.band).toBe("amber");
  });
});

describe("summarise", () => {
  it("handles empty input", () => {
    const s = summarise([]);
    expect(s.count).toBe(0);
    expect(s.averageScore).toBe(0);
    expect(s.healthyPct).toBe(0);
  });

  it("ranks biggest-impact items by missing-field weight", () => {
    const items = [
      { id: "1", ...fullItem() }, // 100
      { id: "2", ...fullItem(), brand: null }, // 80, missing brand (20)
      { id: "3", ...fullItem(), vintedUrl: null }, // 95, missing vintedUrl (5)
      { id: "4", ...fullItem(), description: "no" }, // 80, missing description (20)
    ];
    const s = summarise(items, 2);
    expect(s.count).toBe(4);
    // The two items with the biggest-weight gap should surface first
    const topFields = s.biggestImpact.map((b) => b.missingField).sort();
    expect(topFields).toEqual(["brand", "description"]);
  });

  it("computes healthy percentage", () => {
    const items = [
      { id: "1", ...fullItem() }, // green
      { id: "2", ...fullItem() }, // green
      { id: "3", ...fullItem(), brand: null, category: null }, // 65 amber
      {
        id: "4",
        ...fullItem(),
        brand: null,
        category: null,
        size: null,
        description: "x",
        photoUrls: [],
      }, // red
    ];
    const s = summarise(items);
    expect(s.bands.green).toBe(2);
    expect(s.bands.amber).toBe(1);
    expect(s.bands.red).toBe(1);
    expect(s.healthyPct).toBe(50);
  });
});
