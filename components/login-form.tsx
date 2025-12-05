"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useState(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  });

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        toast.error(data.error || "Failed to send code");
        return;
      }

      toast.success("Verification code sent to your email");
      setStep("code");
    } catch (error) {
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6 || isLoading) return;

    setIsLoading(true);
    try {
      const result = await signIn("email-otp", {
        email,
        code,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid or expired code");
        return;
      }

      toast.success("Successfully signed in!");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        toast.error(data.error || "Failed to resend code");
        return;
      }

      setCooldown(60);
      toast.success("New code sent to your email");
    } catch (error) {
      toast.error("Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !email}>
          {isLoading ? "Sending..." : "Send verification code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to {email}
        </p>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
          disabled={isLoading}
          className="text-center text-2xl tracking-widest"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || code.length !== 6}
      >
        {isLoading ? "Verifying..." : "Verify code"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          Change email
        </button>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={cooldown > 0 || isLoading}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
