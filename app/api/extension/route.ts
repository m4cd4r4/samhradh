import { NextRequest, NextResponse } from "next/server";
import { getVideoWithTranscript } from "@/lib/youtube";
import { summarizeTranscript } from "@/lib/summarize";
import { sendSummaryEmail } from "@/lib/email";
import { extractVideoId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.EXTENSION_API_KEY) {
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

    // Get video info and transcript
    const { metadata, transcript } = await getVideoWithTranscript(url);

    // Generate summary
    const summary = await summarizeTranscript({
      transcript,
      videoTitle: metadata.title,
      channelName: metadata.channelName,
    });

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
      title: metadata.title,
      channelName: metadata.channelName,
    });
  } catch (error) {
    console.error("Extension API error:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
