import { isValid, parse, parseISO } from "date-fns";
import { isPaymentMethod, PAYMENT_METHODS, PaymentMethod } from "@/types/expense";
import { createExpenseSchema } from "@/lib/validations/expense";

/** Splits CSV text into rows of fields. Handles quotes, escaped quotes ("") and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "day", "transaction date"],
  amount: ["amount", "price", "total", "value"],
  category: ["category", "type"],
  description: ["description", "details", "note", "notes", "title", "name"],
  tags: ["tags", "tag", "labels"],
  location: ["location", "place", "merchant", "store"],
  paymentMethod: ["payment method", "payment", "method", "paid with"],
};

type Field = keyof typeof HEADER_ALIASES;

export interface ImportedRow {
  line: number;
  values: {
    date: Date;
    amount: number;
    category: string;
    description: string;
    tags: string[];
    location?: string;
    paymentMethod?: PaymentMethod;
  } | null;
  errors: string[];
}

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "d MMM yyyy",
];

function parseDate(value: string): Date | null {
  const v = value.trim();
  const iso = parseISO(v);
  if (isValid(iso)) return iso;
  for (const f of DATE_FORMATS) {
    const d = parse(v, f, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

function parsePaymentMethod(value: string): PaymentMethod | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (isPaymentMethod(v)) return v;
  return PAYMENT_METHODS.find((m) => m.label.toLowerCase() === v)?.value;
}

/**
 * Turns parsed CSV rows (first row = header) into validated expense values.
 * Unknown categories fall back to "other"; each row reports its own errors.
 */
export function mapCsvRows(
  rows: string[][],
  knownCategories: string[],
  userId: string,
): { rows: ImportedRow[]; missingColumns: Field[] } {
  if (rows.length === 0) return { rows: [], missingColumns: ["date", "amount", "description"] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const index = {} as Record<Field, number>;
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    index[field] = header.findIndex((h) => HEADER_ALIASES[field].includes(h));
  }
  const missingColumns = (["date", "amount", "description"] as Field[]).filter(
    (f) => index[f] === -1,
  );
  if (missingColumns.length > 0) return { rows: [], missingColumns };

  const categories = new Map(knownCategories.map((c) => [c.toLowerCase(), c]));
  const cell = (r: string[], f: Field) => (index[f] >= 0 ? (r[index[f]] ?? "").trim() : "");

  const result = rows.slice(1).map((r, i): ImportedRow => {
    const line = i + 2;
    const errors: string[] = [];
    const date = parseDate(cell(r, "date"));
    if (!date) errors.push("Invalid date");
    const amount = Number(cell(r, "amount").replace(/[^0-9.-]/g, ""));
    const category = categories.get(cell(r, "category").toLowerCase()) ?? "other";
    const tags = cell(r, "tags")
      .split(/[;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const location = cell(r, "location") || undefined;
    const paymentMethod = parsePaymentMethod(cell(r, "paymentMethod"));

    const values = {
      date: date ?? new Date(NaN),
      amount,
      category,
      description: cell(r, "description"),
      tags,
      location,
      paymentMethod,
    };
    if (date) {
      const parsed = createExpenseSchema.safeParse({ ...values, userId });
      if (!parsed.success) errors.push(...parsed.error.issues.map((issue) => issue.message));
    }
    return { line, values: errors.length ? null : values, errors };
  });

  return { rows: result, missingColumns: [] };
}
