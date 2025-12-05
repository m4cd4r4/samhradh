import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getVideoWithTranscript } from "@/lib/youtube";
import { summarizeTranscript } from "@/lib/summarize";
import { sendSummaryEmail, type VideoSummary } from "@/lib/email";
import { saveSummary, getSummaryByVideoId } from "@/lib/redis";
import { extractVideoId, buildYouTubeUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProgressUpdate {
  type: "progress" | "complete" | "error";
  index: number;
  total: number;
  videoUrl: string;
  status: "pending" | "processing" | "success" | "error";
  title?: string;
  summary?: string;
  error?: string;
  cached?: boolean;
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { urls, email, singleEmail } = await request.json();

  // Validate input
  if (!Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ error: "URLs are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urls.length > 10) {
    return new Response(JSON.stringify({ error: "Maximum 10 URLs allowed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const completedSummaries: VideoSummary[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: ProgressUpdate) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"));
      };

      // Process videos with limited concurrency (2 at a time)
      const validUrls = urls.filter((url: string) => extractVideoId(url));

      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        const videoId = extractVideoId(url);

        // Send processing started
        sendUpdate({
          type: "progress",
          index: i,
          total: validUrls.length,
          videoUrl: url,
          status: "processing",
        });

        try {
          // Check if already summarized
          const existing = await getSummaryByVideoId(session.user.id, videoId!);

          if (existing) {
            completedSummaries.push({
              title: existing.title,
              channelName: existing.channelName,
              videoUrl: existing.videoUrl,
              thumbnailUrl: existing.thumbnailUrl,
              summary: existing.summary,
            });

            sendUpdate({
              type: "progress",
              index: i,
              total: validUrls.length,
              videoUrl: url,
              title: existing.title,
              status: "success",
              summary: existing.summary,
              cached: true,
            });

            // Send individual email if not batching
            if (!singleEmail) {
              await sendSummaryEmail({
                to: email,
                summaries: [{
                  title: existing.title,
                  channelName: existing.channelName,
                  videoUrl: existing.videoUrl,
                  thumbnailUrl: existing.thumbnailUrl,
                  summary: existing.summary,
                }],
              });
            }

            continue;
          }

          // Get video info and transcript
          const { metadata, transcript } = await getVideoWithTranscript(url);

          // Generate summary
          const summary = await summarizeTranscript({
            transcript,
            videoTitle: metadata.title,
            channelName: metadata.channelName,
          });

          // Create record
          const record = {
            id: crypto.randomUUID(),
            videoId: videoId!,
            userId: session.user.id,
            title: metadata.title,
            channelName: metadata.channelName,
            thumbnailUrl: metadata.thumbnailUrl,
            videoUrl: metadata.videoUrl,
            transcript,
            summary,
            createdAt: new Date().toISOString(),
            emailedTo: email,
          };

          // Save to Redis
          await saveSummary(record);

          completedSummaries.push({
            title: metadata.title,
            channelName: metadata.channelName,
            videoUrl: metadata.videoUrl,
            thumbnailUrl: metadata.thumbnailUrl,
            summary,
          });

          // Send individual email if not batching
          if (!singleEmail) {
            await sendSummaryEmail({
              to: email,
              summaries: [{
                title: metadata.title,
                channelName: metadata.channelName,
                videoUrl: metadata.videoUrl,
                thumbnailUrl: metadata.thumbnailUrl,
                summary,
              }],
            });
          }

          sendUpdate({
            type: "progress",
            index: i,
            total: validUrls.length,
            videoUrl: url,
            title: metadata.title,
            status: "success",
            summary,
            cached: false,
          });
        } catch (error) {
          sendUpdate({
            type: "error",
            index: i,
            total: validUrls.length,
            videoUrl: url,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Send batch email if requested
      if (singleEmail && completedSummaries.length > 0) {
        try {
          await sendSummaryEmail({
            to: email,
            summaries: completedSummaries,
          });
        } catch (error) {
          console.error("Failed to send batch email:", error);
        }
      }

      // Send complete
      sendUpdate({
        type: "complete",
        index: validUrls.length,
        total: validUrls.length,
        videoUrl: "",
        status: "success",
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
