import { Resend } from "resend";
import SummaryEmail from "@/emails/SummaryEmail";

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface VideoSummary {
  title: string;
  channelName: string;
  videoUrl: string;
  thumbnailUrl: string;
  summary: string;
}

interface SendSummaryEmailOptions {
  to: string;
  summaries: VideoSummary[];
}

/**
 * Send summary email(s) via Resend
 */
export async function sendSummaryEmail({
  to,
  summaries,
}: SendSummaryEmailOptions): Promise<void> {
  if (summaries.length === 0) {
    throw new Error("No summaries to send");
  }

  const subject =
    summaries.length === 1
      ? `Summary: ${summaries[0].title}`
      : `${summaries.length} Video Summaries Ready`;

  try {
    const { error } = await getResend().emails.send({
      from: "YT Summarizer <onboarding@resend.dev>",
      to: [to],
      subject,
      react: SummaryEmail({ summaries }),
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  } catch (error) {
    console.error("Failed to send summary email:", error);
    throw new Error("Failed to send email. Please check your email address and try again.");
  }
}
