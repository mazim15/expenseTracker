import { describe, it, expect } from "vitest";
import { parseCsv, mapCsvRows } from "./importCsv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and CRLF", () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
});

describe("mapCsvRows", () => {
  const csv = [
    "Date,Amount,Category,Description,Tags,Location,Payment method",
    "2026-09-01,1200,Food,Lunch,work;team,KFC,Card",
    "01/09/2026,500,unknown,Bus,,,cash",
    "bad-date,100,food,Thing,,,",
    "2026-09-02,-5,food,Refund,,,",
  ].join("\n");

  it("validates each row and maps categories and payment methods", () => {
    const { rows, missingColumns } = mapCsvRows(parseCsv(csv), ["food", "other"], "u1");
    expect(missingColumns).toEqual([]);
    expect(rows[0].values).toMatchObject({
      amount: 1200,
      category: "food",
      tags: ["work", "team"],
      paymentMethod: "card",
    });
    expect(rows[1].values).toMatchObject({ category: "other", paymentMethod: "cash" });
    expect(rows[2].errors).toContain("Invalid date");
    expect(rows[3].values).toBeNull();
  });

  it("reports missing required columns", () => {
    expect(mapCsvRows([["foo", "bar"]], [], "u1").missingColumns).toEqual([
      "date",
      "amount",
      "description",
    ]);
  });
});

describe("export → import round trip", () => {
  it("re-imports what the exporter writes", async () => {
    const { expensesToCSV } = await import("./exportData");
    const csv = expensesToCSV([
      {
        id: "1",
        userId: "u1",
        amount: 99.5,
        date: new Date(2026, 8, 3),
        category: "food",
        description: 'Tea, "chai" & biscuits',
        tags: ["office", "snacks"],
        location: "Cafe, Gulberg",
        paymentMethod: "wallet",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const { rows } = mapCsvRows(parseCsv("﻿" + csv), ["food"], "u1");
    expect(rows[0].values).toMatchObject({
      amount: 99.5,
      description: 'Tea, "chai" & biscuits',
      tags: ["office", "snacks"],
      location: "Cafe, Gulberg",
      paymentMethod: "wallet",
    });
  });
});
