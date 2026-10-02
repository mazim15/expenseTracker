import { describe, it, expect } from "vitest";
import { buildEnrichPrompt, parseEnrichResponse } from "./enrichment";

describe("parseEnrichResponse", () => {
  it("keeps results for requested ids and trims names", () => {
    const text = JSON.stringify({
      results: [
        { id: "a", merchant: " KFC ", brand: "" },
        { id: "b", merchant: "", brand: "Tifal" },
      ],
    });
    expect(parseEnrichResponse(text, ["a", "b"])).toEqual([
      { id: "a", merchant: "KFC", brand: "" },
      { id: "b", merchant: "", brand: "Tifal" },
    ]);
  });

  it("drops unknown and duplicate ids", () => {
    const text = JSON.stringify({
      results: [
        { id: "a", merchant: "KFC", brand: "" },
        { id: "a", merchant: "McDonald's", brand: "" },
        { id: "zzz", merchant: "Evil", brand: "" },
      ],
    });
    expect(parseEnrichResponse(text, ["a"])).toEqual([{ id: "a", merchant: "KFC", brand: "" }]);
  });

  it("handles JSON wrapped in a code fence and non-string names", () => {
    const text = '```json\n{"results":[{"id":"a","merchant":42,"brand":null}]}\n```';
    expect(parseEnrichResponse(text, ["a"])).toEqual([{ id: "a", merchant: "", brand: "" }]);
  });

  it("caps names at 100 characters", () => {
    const text = JSON.stringify({ results: [{ id: "a", merchant: "x".repeat(150), brand: "" }] });
    expect(parseEnrichResponse(text, ["a"])?.[0].merchant).toHaveLength(100);
  });

  it("accepts a bare array or a different key", () => {
    const bare = JSON.stringify([{ id: "a", merchant: "KFC", brand: "" }]);
    const otherKey = JSON.stringify({ expenses: [{ id: "a", merchant: "KFC", brand: "" }] });
    expect(parseEnrichResponse(bare, ["a"])).toEqual([{ id: "a", merchant: "KFC", brand: "" }]);
    expect(parseEnrichResponse(otherKey, ["a"])).toEqual([{ id: "a", merchant: "KFC", brand: "" }]);
  });

  it("returns null for an empty reply (e.g. safety filter)", () => {
    expect(parseEnrichResponse("", ["a"])).toBeNull();
  });

  it("returns null for unreadable replies", () => {
    expect(parseEnrichResponse("sorry, I can't", ["a"])).toBeNull();
    expect(parseEnrichResponse('{"results": "nope"}', ["a"])).toBeNull();
  });
});

describe("buildEnrichPrompt", () => {
  it("includes known merchants so spellings converge", () => {
    const prompt = buildEnrichPrompt(
      [{ id: "a", description: "zinger", location: "K.F.C", category: "food" }],
      ["KFC"],
    );
    expect(prompt).toContain("KFC");
    expect(prompt).toContain('"id":"a"');
  });
});
