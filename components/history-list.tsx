"use client";

import { useState } from "react";
import { SummaryCard } from "./summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { SummaryRecord } from "@/lib/redis";

interface HistoryListProps {
  initialSummaries: SummaryRecord[];
  initialTotal: number;
  initialPage: number;
  limit: number;
}

export function HistoryList({
  initialSummaries,
  initialTotal,
  initialPage,
  limit,
}: HistoryListProps) {
  const [summaries, setSummaries] = useState(initialSummaries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / limit);

  const fetchPage = async (newPage: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?page=${newPage}&limit=${limit}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSummaries(data.summaries);
      setTotal(data.total);
      setPage(data.page);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to fetch history");
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
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
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No summaries yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Summarize a YouTube video to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === summaries.length ? "Deselect All" : "Select All"}
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
        </p>
      </div>

      {/* Summary List */}
      <div className="space-y-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className={`relative ${
              selectedIds.has(summary.id)
                ? "ring-2 ring-primary rounded-lg"
                : ""
            }`}
            onClick={() => toggleSelect(summary.id)}
          >
            <SummaryCard
              summary={summary}
              showDelete
              onDelete={handleDelete}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPage(page - 1)}
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
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
