import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const code = credentials?.code as string;

        if (!email || !code) {
          return null;
        }

        // Verify OTP from Redis
        const storedOtp = await redis.get<{ code: string; expires: number }>(
          `auth:otp:${email}`
        );

        if (!storedOtp || storedOtp.code !== code) {
          return null;
        }

        if (Date.now() > storedOtp.expires) {
          await redis.del(`auth:otp:${email}`);
          return null;
        }

        // OTP valid - delete it
        await redis.del(`auth:otp:${email}`);

        // Get or create user
        let userId = await redis.get<string>(`user:email:${email}`);

        if (!userId) {
          // Create new user
          userId = crypto.randomUUID();
          await redis.set(`user:email:${email}`, userId);
          await redis.hset(`user:${userId}`, {
            id: userId,
            email,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          id: userId,
          email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
