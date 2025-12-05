import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a concise summarizer. Given a video transcript, produce:

## TL;DR
[2-3 sentence overview]

## Key Points
- [Bullet points of main ideas, max 7]

## Notable Quotes
- [1-3 direct quotes with timestamps if available]

## Action Items
- [Any actionable takeaways, or "None" if purely informational]

Keep total output under 400 words.`;

export interface SummarizeOptions {
  transcript: string;
  videoTitle: string;
  channelName?: string;
}

/**
 * Summarize a transcript using Claude Haiku
 */
export async function summarizeTranscript({
  transcript,
  videoTitle,
  channelName,
}: SummarizeOptions): Promise<string> {
  const userMessage = channelName
    ? `Video: "${videoTitle}" by ${channelName}\n\nTranscript:\n${transcript}`
    : `Video: "${videoTitle}"\n\nTranscript:\n${transcript}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from the response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    return textContent.text;
  } catch (error) {
    console.error("Failed to summarize transcript:", error);

    // Check for rate limiting
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("Rate limited by Claude API. Please try again in a moment.");
    }

    // Check for API key issues
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error("Invalid Anthropic API key. Please check your configuration.");
    }

    throw new Error("Failed to generate summary. Please try again.");
  }
}
