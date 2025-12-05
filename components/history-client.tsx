"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "./summary-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { SummaryRecord } from "@/lib/redis";

const LIMIT = 20;

export function HistoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const totalPages = Math.ceil(total / LIMIT);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url: string;
      if (debouncedQuery) {
        url = `/api/search?q=${encodeURIComponent(debouncedQuery)}`;
      } else {
        url = `/api/history?page=${page}&limit=${LIMIT}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSummaries(data.summaries);
      setTotal(debouncedQuery ? data.summaries.length : data.total);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to fetch history");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, page]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setSummaries((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      toast.success("Summary deleted");
    } catch (error) {
      toast.error("Failed to delete summary");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setSummaries((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setTotal((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} summaries`);
    } catch (error) {
      toast.error("Failed to delete summaries");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === summaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(summaries.map((s) => s.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search summaries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex gap-4">
                <Skeleton className="w-32 h-18 sm:w-40 sm:h-[90px] rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && summaries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {debouncedQuery ? "No results found" : "No summaries yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {debouncedQuery
              ? "Try a different search term"
              : "Summarize a YouTube video to get started"}
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && summaries.length > 0 && (
        <>
          {/* Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === summaries.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "summary" : "summaries"}
              {debouncedQuery && ` matching "${debouncedQuery}"`}
            </p>
          </div>

          {/* Summary List */}
          <div className="space-y-4">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                className={`cursor-pointer ${
                  selectedIds.has(summary.id)
                    ? "ring-2 ring-primary rounded-lg"
                    : ""
                }`}
                onClick={(e) => {
                  // Don't toggle selection if clicking on buttons
                  if ((e.target as HTMLElement).closest("button, a")) {
                    return;
                  }
                  toggleSelect(summary.id);
                }}
              >
                <SummaryCard
                  summary={summary}
                  showDelete
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>

          {/* Pagination (only when not searching) */}
          {!debouncedQuery && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
