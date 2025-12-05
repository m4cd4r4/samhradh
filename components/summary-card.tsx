"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import type { SummaryRecord } from "@/lib/redis";

interface SummaryCardProps {
  summary: SummaryRecord;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  defaultExpanded?: boolean;
}

export function SummaryCard({
  summary,
  onDelete,
  showDelete = false,
  defaultExpanded = false,
}: SummaryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Extract TL;DR from summary for preview
  const getTldr = () => {
    const tldrMatch = summary.summary.match(/## TL;DR\s*([\s\S]*?)(?=##|$)/);
    if (tldrMatch) {
      return tldrMatch[1].trim();
    }
    return summary.summary.slice(0, 150) + "...";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <a
            href={summary.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <div className="relative w-32 h-18 sm:w-40 sm:h-[90px] rounded-md overflow-hidden bg-muted">
              <Image
                src={summary.thumbnailUrl}
                alt={summary.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 160px"
              />
            </div>
          </a>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <a
              href={summary.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <h3 className="font-semibold line-clamp-2 text-sm sm:text-base">
                {summary.title}
              </h3>
            </a>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.channelName}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {formatDate(summary.createdAt)}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(summary.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* TL;DR Preview (always visible) */}
        {!expanded && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {getTldr()}
          </p>
        )}

        {/* Full Summary (expanded) */}
        {expanded && (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(summary.summary),
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={summary.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Watch Video
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple markdown to HTML conversion
function formatMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\[(\d+:\d+)\]/g, '<span class="text-muted-foreground text-xs">[$1]</span>');
}
