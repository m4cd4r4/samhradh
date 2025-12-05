import { YoutubeTranscript } from "youtube-transcript";
import { extractVideoId, buildYouTubeUrl } from "./utils";

export interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

export interface VideoMetadata {
  title: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
}

const MAX_TRANSCRIPT_CHARS = 100000;

/**
 * Fetch transcript for a YouTube video using youtube-transcript package
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptItem[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map((item) => ({
      text: item.text,
      offset: item.offset,
      duration: item.duration,
    }));
  } catch (error) {
    console.error("Failed to fetch transcript:", error);
    throw new Error("Failed to fetch transcript. The video may not have captions available.");
  }
}

/**
 * Fetch video metadata using YouTube oEmbed API (no API key needed)
 */
export async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  const response = await fetch(oembedUrl, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error("Failed to fetch video metadata. The video may not exist or is private.");
  }

  const data = await response.json();
  const videoId = extractVideoId(videoUrl);

  return {
    title: data.title,
    channelName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
    videoUrl: videoId ? buildYouTubeUrl(videoId) : videoUrl,
  };
}

/**
 * Format transcript for summarization with timestamps
 */
export function formatTranscriptForSummary(items: TranscriptItem[]): string {
  let formatted = items
    .map((item) => {
      const minutes = Math.floor(item.offset / 60000);
      const seconds = Math.floor((item.offset % 60000) / 1000);
      const timestamp = `[${minutes}:${seconds.toString().padStart(2, "0")}]`;
      return `${timestamp} ${item.text}`;
    })
    .join("\n");

  // Truncate if too long
  if (formatted.length > MAX_TRANSCRIPT_CHARS) {
    formatted = formatted.slice(0, MAX_TRANSCRIPT_CHARS);
    // Find the last complete sentence or paragraph
    const lastPeriod = formatted.lastIndexOf(".");
    const lastNewline = formatted.lastIndexOf("\n");
    const cutoff = Math.max(lastPeriod, lastNewline);
    if (cutoff > MAX_TRANSCRIPT_CHARS * 0.8) {
      formatted = formatted.slice(0, cutoff + 1);
    }
    formatted += "\n\n[Transcript truncated due to length...]";
  }

  return formatted;
}

/**
 * Get full video info including transcript
 */
export async function getVideoWithTranscript(url: string) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const videoUrl = buildYouTubeUrl(videoId);

  // Fetch metadata and transcript in parallel
  const [metadata, transcriptItems] = await Promise.all([
    getVideoMetadata(videoUrl),
    fetchTranscript(videoId),
  ]);

  const transcript = formatTranscriptForSummary(transcriptItems);

  return {
    videoId,
    metadata,
    transcript,
  };
}
