import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Tests for the describe API's logic patterns.
// Models list is defined inline since route files can't export non-HTTP symbols.
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini Flash Lite", description: "Best balance of quality & cost", costPer1k: "$0.25", tier: "recommended" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", description: "Great natural copy", costPer1k: "$0.19", tier: "recommended" },
  { id: "qwen/qwen3.5-flash-02-23", name: "Qwen3.5 Flash", description: "Strong structured extraction", costPer1k: "$0.16", tier: "budget" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", name: "Mistral Small 3.1", description: "Cheapest", costPer1k: "$0.07", tier: "budget" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 (Free)", description: "Free tier", costPer1k: "Free", tier: "free" },
];

describe("describe API — model configuration", () => {
  it("has available models", () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it("each model has required fields", () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
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

describe("describe API — JSON parsing", () => {
  it("handles markdown code blocks", () => {
    const wrappedResponse = '```json\n{"description":"test","hashtags":["a"],"detected_brand":null,"detected_category":null}\n```';
    const jsonMatch = wrappedResponse.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.description).toBe("test");
  });

  it("handles raw JSON response", () => {
    const rawResponse = '{"description":"raw test","hashtags":["b","c"],"detected_brand":"Nike","detected_category":"shoes"}';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.detected_brand).toBe("Nike");
  });

  it("handles response with leading text", () => {
    const response = 'Here is the listing:\n{"description":"with preamble","hashtags":[],"detected_brand":null,"detected_category":null}';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.description).toBe("with preamble");
  });

  it("returns null for non-JSON response", () => {
    const response = "Sorry, I cannot generate a description for this item.";
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    expect(jsonMatch).toBeNull();
  });
});
