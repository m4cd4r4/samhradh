import { Redis } from "@upstash/redis";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let redisInstance: Redis | null = null;
let resendInstance: Resend | null = null;

function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface SendOTPResult {
  success: boolean;
  error?: string;
  cooldownRemaining?: number;
}

export async function sendOTP(email: string): Promise<SendOTPResult> {
  const redis = getRedis();
  
  // Check cooldown
  const existingOtp = await redis.get<{ code: string; expires: number; sentAt: number }>(
    `auth:otp:${email}`
  );

  if (existingOtp?.sentAt) {
    const timeSinceSent = Date.now() - existingOtp.sentAt;
    if (timeSinceSent < OTP_COOLDOWN_MS) {
      return {
        success: false,
        error: "Please wait before requesting another code",
        cooldownRemaining: Math.ceil((OTP_COOLDOWN_MS - timeSinceSent) / 1000),
      };
    }
  }

  const code = generateOTP();
  const expires = Date.now() + OTP_EXPIRY_MS;

  // Store OTP in Redis
  await redis.set(
    `auth:otp:${email}`,
    { code, expires, sentAt: Date.now() },
    { ex: 300 } // 5 minute TTL
  );

  // Send email via Resend
  try {
    await getResend().emails.send({
      from: "YT Summarizer <onboarding@resend.dev>",
      to: email,
      subject: "Your verification code",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 20px;">Verification Code</h2>
          <p style="color: #4a4a4a; margin-bottom: 20px;">
            Enter this code to sign in to YouTube Transcript Summarizer:
          </p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
              ${code}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This code expires in 5 minutes. If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    // Delete the stored OTP if email failed
    await redis.del(`auth:otp:${email}`);
    return {
      success: false,
      error: "Failed to send verification email. Please try again.",
    };
  }
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const redis = getRedis();
  
  const storedOtp = await redis.get<{ code: string; expires: number }>(
    `auth:otp:${email}`
  );

  if (!storedOtp) {
    return false;
  }

  if (Date.now() > storedOtp.expires) {
    await redis.del(`auth:otp:${email}`);
    return false;
  }

  return storedOtp.code === code;
}
