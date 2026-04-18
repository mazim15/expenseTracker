"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface SearchFilterProps {
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    id: string;
    label: string;
    options: FilterOption[];
  }[];
  activeFilters: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  onClearFilter: (filterId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function SearchFilter({
  placeholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  activeFilters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  className,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = Object.keys(activeFilters).filter((key) => activeFilters[key]).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="focus-visible:ring-primary/20 h-11 pr-4 pl-10 transition-all focus-visible:ring-2"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              className="hover:bg-destructive/10 hover:text-destructive absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 transform p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Button */}
        {filters.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "relative h-11 px-4 transition-all",
                  hasActiveFilters &&
                    "border-primary bg-primary/5 text-primary hover:bg-primary/10",
                )}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge
                    variant="secondary"
                    className="bg-primary text-primary-foreground ml-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClearAll();
                        setIsFilterOpen(false);
                      }}
                      className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {filters.map((filter) => (
                  <div key={filter.id} className="space-y-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      {filter.label}
                    </label>
                    <Select
                      value={activeFilters[filter.id] || ""}
                      onValueChange={(value) => {
                        if (value === "all") {
                          onClearFilter(filter.id);
                        } else {
                          onFilterChange(filter.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="animate-fade-in flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            if (!value) return null;

            const filter = filters.find((f) => f.id === filterId);
            const option = filter?.options.find((o) => o.value === value);

            if (!filter || !option) return null;

            return (
              <Badge
                key={filterId}
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 gap-1 px-3 py-1 transition-colors"
              >
                <span className="text-muted-foreground text-xs">{filter.label}:</span>
                <span>{option.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClearFilter(filterId)}
                  className="hover:bg-destructive/20 hover:text-destructive ml-1 h-4 w-4 rounded-full p-0"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
