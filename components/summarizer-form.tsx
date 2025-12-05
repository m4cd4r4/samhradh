"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UrlInput } from "./url-input";
import { EmailInput } from "./email-input";
import { SummaryCard } from "./summary-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isValidYouTubeUrl } from "@/lib/utils";
import type { SummaryRecord } from "@/lib/redis";

interface SummarizerFormProps {
  userEmail: string;
}

export function SummarizerForm({ userEmail }: SummarizerFormProps) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Set default email
  useEffect(() => {
    if (!email && userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail, email]);

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canSubmit) {
          handleSubmit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const canSubmit =
    url &&
    email &&
    isValidYouTubeUrl(url) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setSummary(null);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process video");
      }

      setSummary(data.summary);
      toast.success(
        data.cached
          ? "Summary sent to your email (from cache)"
          : "Summary generated and sent to your email!"
      );

      // Clear URL for next video
      setUrl("");
      urlInputRef.current?.focus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <UrlInput
            ref={urlInputRef}
            value={url}
            onChange={setUrl}
            disabled={isLoading}
          />

          <EmailInput
            value={email}
            onChange={setEmail}
            defaultEmail={userEmail}
            disabled={isLoading}
          />

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Summarize & Email"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘</kbd>+
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to
            submit
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Skeleton className="w-32 h-18 sm:w-40 sm:h-[90px] rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {summary && !isLoading && (
        <SummaryCard summary={summary} defaultExpanded />
      )}
    </div>
  );
}
