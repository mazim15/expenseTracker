"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { DateRange as DayRange } from "react-day-picker";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RANGE_PRESETS, DateRange, RangePreset } from "@/lib/dateRange";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  range: DateRange;
  onChange: (preset: RangePreset, from?: string, to?: string) => void;
  className?: string;
}

export function DateRangePicker({ range, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(range.preset === "custom");
  const [draft, setDraft] = useState<DayRange | undefined>(
    range.preset === "custom" ? { from: range.start, to: range.end } : undefined,
  );

  const pick = (preset: RangePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange(preset);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draft?.from) return;
    onChange(
      "custom",
      format(draft.from, "yyyy-MM-dd"),
      format(draft.to ?? draft.from, "yyyy-MM-dd"),
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("bg-card gap-2", className)}>
          <CalendarRange className="h-4 w-4" />
          <span className="max-w-[11rem] truncate">{range.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn("p-2", showCustom ? "w-auto" : "w-56")}>
        <div className={cn("flex gap-2", showCustom && "flex-col sm:flex-row")}>
          <ul className="min-w-[10rem] space-y-0.5" role="listbox" aria-label="Date range">
            {RANGE_PRESETS.map((p) => {
              const active =
                p.value === "custom" ? showCustom : !showCustom && range.preset === p.value;
              return (
                <li key={p.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(p.value)}
                    className={cn(
                      "hover:bg-accent flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                      active && "bg-primary/10 text-primary",
                    )}
                  >
                    {p.label}
                    {active && <Check className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {showCustom && (
            <div className="border-border/60 sm:border-l sm:pl-2">
              <Calendar
                mode="range"
                selected={draft}
                onSelect={setDraft}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
                defaultMonth={draft?.from ?? new Date()}
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2">
                <span className="text-muted-foreground text-xs">
                  {draft?.from
                    ? `${format(draft.from, "d MMM")} – ${format(draft.to ?? draft.from, "d MMM")}`
                    : "Pick start and end"}
                </span>
                <Button size="sm" onClick={applyCustom} disabled={!draft?.from}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
