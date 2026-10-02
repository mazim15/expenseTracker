"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpenseType } from "@/types/expense";
import { mapCsvRows, parseCsv, ImportedRow } from "@/lib/utils/importCsv";
import { findLikelyDuplicate } from "@/lib/utils/duplicates";
import { importExpenses } from "@/lib/expenses";
import { formatCurrency, cn } from "@/lib/utils";

type Row = ImportedRow & { duplicate: ExpenseType | null };

export default function ImportCsvDialog({
  open,
  onOpenChange,
  userId,
  categories,
  existing,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  categories: string[];
  existing: ExpenseType[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setMissing([]);
    setSelected(new Set());
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!userId) return;
    const text = await file.text();
    const result = mapCsvRows(parseCsv(text), categories, userId);
    const withDupes: Row[] = result.rows.map((r) => ({
      ...r,
      duplicate: r.values ? findLikelyDuplicate(r.values, existing) : null,
    }));
    setFileName(file.name);
    setMissing(result.missingColumns);
    setRows(withDupes);
    // Valid, non-duplicate rows start selected
    setSelected(new Set(withDupes.flatMap((r, i) => (r.values && !r.duplicate ? [i] : []))));
  };

  const counts = useMemo(
    () => ({
      valid: rows.filter((r) => r.values).length,
      invalid: rows.filter((r) => !r.values).length,
      duplicates: rows.filter((r) => r.duplicate).length,
    }),
    [rows],
  );

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const handleImport = async () => {
    if (!userId) return;
    const items = [...selected].map((i) => rows[i].values!).filter(Boolean);
    if (items.length === 0) return;
    setImporting(true);
    try {
      const count = await importExpenses(
        userId,
        items.map((v) => ({ ...v, location: v.location ?? "" })),
      );
      toast.success(`Imported ${count} expense${count === 1 ? "" : "s"}`);
      onImported();
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("CSV import failed:", err);
      toast.error("Import failed. Nothing after the last saved batch was added.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import expenses from CSV</DialogTitle>
          <DialogDescription>
            Needs Date, Amount and Description columns. Category, Tags (separated by ;), Location
            and Payment method are optional. Files exported from this app work as-is.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {!fileName ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-primary/30 bg-primary/5 hover:bg-primary/10 flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-colors"
          >
            <span className="bg-hero inline-flex h-12 w-12 items-center justify-center rounded-2xl">
              <FileUp className="h-6 w-6" />
            </span>
            <span className="font-semibold">Choose a CSV file</span>
          </button>
        ) : missing.length > 0 ? (
          <div className="bg-destructive/10 text-destructive rounded-2xl p-4 text-sm">
            <p className="font-semibold">
              Missing column{missing.length > 1 ? "s" : ""}: {missing.join(", ")}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
              Choose another file
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="bg-primary/12 text-primary rounded-full px-2.5 py-1">
                {counts.valid} ready
              </span>
              {counts.duplicates > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                  {counts.duplicates} possible duplicates (unchecked)
                </span>
              )}
              {counts.invalid > 0 && (
                <span className="bg-destructive/12 text-destructive rounded-full px-2.5 py-1">
                  {counts.invalid} with errors (skipped)
                </span>
              )}
              <span className="text-muted-foreground ml-auto truncate">{fileName}</span>
            </div>
            <ul className="max-h-[45dvh] space-y-1 overflow-y-auto">
              {rows.map((row, i) => (
                <li
                  key={row.line}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2 py-2 text-sm",
                    !row.values && "bg-destructive/5",
                  )}
                >
                  <Checkbox
                    checked={selected.has(i)}
                    disabled={!row.values}
                    onChange={() => toggle(i)}
                    aria-label={`Import line ${row.line}`}
                  />
                  {row.values ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{row.values.description}</p>
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          {format(row.values.date, "d MMM yyyy")} · {row.values.category}
                          {row.duplicate && (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              · <AlertTriangle className="h-3 w-3" /> matches &ldquo;
                              {row.duplicate.description}&rdquo;
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(row.values.amount)}
                      </span>
                    </>
                  ) : (
                    <p className="text-destructive flex-1 text-xs">
                      Line {row.line}: {row.errors.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <DialogFooter>
          {fileName && (
            <Button variant="ghost" onClick={reset} disabled={importing}>
              Start over
            </Button>
          )}
          <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import {selected.size || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
