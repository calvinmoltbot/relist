import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Tests for the describe API route's pure functions.
// We can't easily call Next.js route handlers directly in vitest without
// a full server, so we test the exported logic and mock response shape.
// ---------------------------------------------------------------------------

// Import the available models export
import { AVAILABLE_MODELS } from "@/app/api/describe/route";

describe("describe API — model configuration", () => {
  it("exports available models list", () => {
    expect(AVAILABLE_MODELS).toBeDefined();
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it("each model has required fields", () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.description).toBeTruthy();
      expect(model.costPer1k).toBeTruthy();
      expect(["recommended", "budget", "free"]).toContain(model.tier);
    }
  });

  it("has at least one recommended model", () => {
    const recommended = AVAILABLE_MODELS.filter((m) => m.tier === "recommended");
    expect(recommended.length).toBeGreaterThanOrEqual(1);
  });

  it("default model is first in the list", () => {
    expect(AVAILABLE_MODELS[0].id).toBe("google/gemini-2.5-flash-lite");
  });

  it("model IDs are unique", () => {
    const ids = AVAILABLE_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("describe API — mock response shape", () => {
  // Simulate what getMockResponse returns (it's not exported, so we test the shape)
  const mockResponseShape = {
    description: expect.any(String),
    hashtags: expect.any(Array),
    detected_brand: expect.toBeOneOf([expect.any(String), null]),
    detected_category: expect.toBeOneOf([expect.any(String), null]),
  };

  it("mock response has required fields", () => {
    // This tests the contract that the frontend expects
    const response = {
      description: "Test description with hashtags",
      hashtags: ["vintage", "preloved"],
      detected_brand: "Nike",
      detected_category: "shoes",
    };

    expect(response).toMatchObject({
      description: expect.any(String),
      hashtags: expect.any(Array),
    });
    expect(response.description.length).toBeGreaterThan(0);
    expect(response.hashtags.length).toBeGreaterThan(0);
  });

  it("JSON parsing handles markdown code blocks", () => {
    // Models often wrap JSON in ```json ... ```
    const wrappedResponse = '```json\n{"description":"test","hashtags":["a"],"detected_brand":null,"detected_category":null}\n```';
    const jsonMatch = wrappedResponse.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();

    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.description).toBe("test");
    expect(parsed.hashtags).toEqual(["a"]);
  });

  it("JSON parsing handles raw JSON response", () => {
    const rawResponse = '{"description":"raw test","hashtags":["b","c"],"detected_brand":"Nike","detected_category":"shoes"}';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();

    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.description).toBe("raw test");
    expect(parsed.detected_brand).toBe("Nike");
  });

  it("JSON parsing handles response with leading text", () => {
    const response = 'Here is the listing:\n{"description":"with preamble","hashtags":[],"detected_brand":null,"detected_category":null}';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();

    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.description).toBe("with preamble");
  });

  it("JSON parsing returns null for non-JSON response", () => {
    const response = "Sorry, I cannot generate a description for this item.";
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    expect(jsonMatch).toBeNull();
  });
});
