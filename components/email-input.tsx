"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultEmail?: string;
  disabled?: boolean;
  error?: string;
}

const EMAIL_STORAGE_KEY = "yt-summarizer-email";

export function EmailInput({
  value,
  onChange,
  defaultEmail,
  disabled,
  error,
}: EmailInputProps) {
  // Load saved email on mount
  useEffect(() => {
    if (!value) {
      const savedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
      if (savedEmail) {
        onChange(savedEmail);
      } else if (defaultEmail) {
        onChange(defaultEmail);
      }
    }
  }, [defaultEmail, onChange, value]);

  // Save email when it changes
  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (newValue) {
      localStorage.setItem(EMAIL_STORAGE_KEY, newValue);
    }
  };

  const isValid = value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Send summary to</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={!isValid ? "border-destructive" : ""}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isValid && !error && (
        <p className="text-sm text-destructive">
          Please enter a valid email address
        </p>
      )}
    </div>
  );
}
