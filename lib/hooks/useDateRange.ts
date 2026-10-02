"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isRangePreset, previousRange, resolveRange, RangePreset } from "@/lib/dateRange";

/** The selected date range, kept in the URL (`?range=…&from=…&to=…`) so it survives reloads and can be shared. */
export function useDateRange() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawPreset = params.get("range");
  const preset: RangePreset = isRangePreset(rawPreset) ? rawPreset : "thisMonth";
  const from = params.get("from");
  const to = params.get("to");

  const range = useMemo(() => resolveRange(preset, from, to), [preset, from, to]);
  const prev = useMemo(() => previousRange(range), [range]);

  const setRange = useCallback(
    (next: RangePreset, nextFrom?: string, nextTo?: string) => {
      const sp = new URLSearchParams(params.toString());
      if (next === "thisMonth") sp.delete("range");
      else sp.set("range", next);
      if (next === "custom" && nextFrom) {
        sp.set("from", nextFrom);
        sp.set("to", nextTo ?? nextFrom);
      } else {
        sp.delete("from");
        sp.delete("to");
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { range, prev, setRange };
}
