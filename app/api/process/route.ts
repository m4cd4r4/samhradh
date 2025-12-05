import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVideoWithTranscript } from "@/lib/youtube";
import { summarizeTranscript } from "@/lib/summarize";
import { sendSummaryEmail } from "@/lib/email";
import { saveSummary, getCachedTranscript, getSummaryByVideoId } from "@/lib/redis";
import { extractVideoId, buildYouTubeUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, email } = await request.json();

    // Validate input
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Check if already summarized by this user
    const existing = await getSummaryByVideoId(session.user.id, videoId);
    if (existing) {
      // Re-send email with existing summary
      await sendSummaryEmail({
        to: email,
        summaries: [
          {
            title: existing.title,
            channelName: existing.channelName,
            videoUrl: existing.videoUrl,
            thumbnailUrl: existing.thumbnailUrl,
            summary: existing.summary,
          },
        ],
      });

      return NextResponse.json({
        success: true,
        summary: existing,
        cached: true,
      });
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
      videoId,
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

    // Send email
    await sendSummaryEmail({
      to: email,
      summaries: [
        {
          title: metadata.title,
          channelName: metadata.channelName,
          videoUrl: metadata.videoUrl,
          thumbnailUrl: metadata.thumbnailUrl,
          summary,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      summary: record,
      cached: false,
    });
  } catch (error) {
    console.error("Process error:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
