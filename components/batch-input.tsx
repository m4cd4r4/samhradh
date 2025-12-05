"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmailInput } from "./email-input";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { extractVideoId } from "@/lib/utils";

interface BatchInputProps {
  userEmail: string;
}

interface ProgressItem {
  url: string;
  status: "pending" | "processing" | "success" | "error";
  title?: string;
  error?: string;
  cached?: boolean;
}

export function BatchInput({ userEmail }: BatchInputProps) {
  const [urls, setUrls] = useState("");
  const [email, setEmail] = useState("");
  const [singleEmail, setSingleEmail] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);

  // Set default email
  useEffect(() => {
    if (!email && userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail, email]);

  const urlList = urls
    .split("\n")
    .map((u) => u.trim())
    .filter((u) => u);

  const validUrls = urlList.filter((u) => extractVideoId(u));
  const invalidCount = urlList.length - validUrls.length;

  const canSubmit =
    validUrls.length > 0 &&
    validUrls.length <= 10 &&
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!canSubmit || isProcessing) return;

    setIsProcessing(true);
    setProgress(validUrls.map((url) => ({ url, status: "pending" })));

    try {
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls, email, singleEmail }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to start processing");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update = JSON.parse(line);

              if (update.type === "progress" || update.type === "error") {
                setProgress((prev) =>
                  prev.map((p, i) =>
                    i === update.index
                      ? {
                          ...p,
                          status: update.status,
                          title: update.title,
                          error: update.error,
                          cached: update.cached,
                        }
                      : p
                  )
                );
              }

              if (update.type === "complete") {
                const successCount = progress.filter(
                  (p) => p.status === "success"
                ).length;
                toast.success(
                  `Processed ${successCount} of ${validUrls.length} videos`
                );
              }
            } catch (e) {
              console.error("Failed to parse update:", e);
            }
          }
        }
      }

      // Clear URLs after successful processing
      setUrls("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process videos"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-urls">YouTube URLs (one per line)</Label>
              <span className="text-sm text-muted-foreground">
                {validUrls.length}/10 valid
                {invalidCount > 0 && (
                  <span className="text-destructive">
                    , {invalidCount} invalid
                  </span>
                )}
              </span>
            </div>
            <Textarea
              id="batch-urls"
              placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\n(max 10 URLs)`}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={isProcessing}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <EmailInput
            value={email}
            onChange={setEmail}
            defaultEmail={userEmail}
            disabled={isProcessing}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="single-email"
                checked={singleEmail}
                onCheckedChange={setSingleEmail}
                disabled={isProcessing}
              />
              <Label htmlFor="single-email" className="cursor-pointer">
                Send all summaries in one email
              </Label>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {validUrls.length} videos...
              </>
            ) : (
              `Summarize ${validUrls.length} Video${validUrls.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Display */}
      {progress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Processing Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {progress.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                {/* Status Icon */}
                {item.status === "pending" && (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                {item.status === "processing" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {item.status === "success" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {item.status === "error" && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}

                {/* URL/Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.title || item.url}
                  </p>
                  {item.error && (
                    <p className="text-xs text-destructive">{item.error}</p>
                  )}
                </div>

                {/* Badges */}
                {item.cached && (
                  <Badge variant="secondary" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
