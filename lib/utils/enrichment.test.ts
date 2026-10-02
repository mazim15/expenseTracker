import { describe, it, expect } from "vitest";
import { buildEnrichPrompt, knownMerchantNames, parseEnrichResponse } from "./enrichment";

describe("parseEnrichResponse", () => {
  it("keeps results for requested ids and trims names", () => {
    const text = JSON.stringify({
      results: [
        { id: "a", merchant: " KFC ", brands: [] },
        { id: "b", merchant: "", brands: ["Tifal"] },
      ],
    });
    expect(parseEnrichResponse(text, ["a", "b"])).toEqual([
      { id: "a", merchant: "KFC", brands: [] },
      { id: "b", merchant: "", brands: ["Tifal"] },
    ]);
  });

  it("drops unknown and duplicate ids", () => {
    const text = JSON.stringify({
      results: [
        { id: "a", merchant: "KFC", brands: [] },
        { id: "a", merchant: "McDonald's", brands: [] },
        { id: "zzz", merchant: "Evil", brands: [] },
      ],
    });
    expect(parseEnrichResponse(text, ["a"])).toEqual([{ id: "a", merchant: "KFC", brands: [] }]);
  });

  it("handles JSON wrapped in a code fence and non-string names", () => {
    const text = '```json\n{"results":[{"id":"a","merchant":42,"brands":null}]}\n```';
    expect(parseEnrichResponse(text, ["a"])).toEqual([{ id: "a", merchant: "", brands: [] }]);
  });

  it("caps names at 100 characters", () => {
    const text = JSON.stringify({ results: [{ id: "a", merchant: "x".repeat(150), brands: [] }] });
    expect(parseEnrichResponse(text, ["a"])?.[0].merchant).toHaveLength(100);
  });

  it("accepts a bare array or a different key", () => {
    const bare = JSON.stringify([{ id: "a", merchant: "KFC", brands: [] }]);
    const otherKey = JSON.stringify({ expenses: [{ id: "a", merchant: "KFC", brands: [] }] });
    expect(parseEnrichResponse(bare, ["a"])).toEqual([{ id: "a", merchant: "KFC", brands: [] }]);
    expect(parseEnrichResponse(otherKey, ["a"])).toEqual([
      { id: "a", merchant: "KFC", brands: [] },
    ]);
  });

  it("keeps several brands, deduped case-insensitively", () => {
    const text = JSON.stringify({
      results: [{ id: "a", merchant: "Imtiaz", brands: ["Dettol", "Sunsilk", "dettol", "", 7] }],
    });
    expect(parseEnrichResponse(text, ["a"])?.[0].brands).toEqual(["Dettol", "Sunsilk"]);
  });

  it("accepts a single brand string", () => {
    const text = JSON.stringify({ results: [{ id: "a", merchant: "", brand: "Tifal" }] });
    expect(parseEnrichResponse(text, ["a"])?.[0].brands).toEqual(["Tifal"]);
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

describe("knownMerchantNames", () => {
  it("lists merchants most used first, case-insensitively merged", () => {
    const names = knownMerchantNames([
      { merchant: "KFC" },
      { merchant: "Krave Mart" },
      { merchant: "kfc" },
      { merchant: " " },
      {},
    ]);
    expect(names).toEqual(["KFC", "Krave Mart"]);
  });
});
