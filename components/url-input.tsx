"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidYouTubeUrl } from "@/lib/utils";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export const UrlInput = forwardRef<HTMLInputElement, UrlInputProps>(
  function UrlInput({ value, onChange, disabled, error }, ref) {
    const isValid = value === "" || isValidYouTubeUrl(value);

    return (
      <div className="space-y-2">
        <Label htmlFor="youtube-url">YouTube URL</Label>
        <Input
          ref={ref}
          id="youtube-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={!isValid ? "border-destructive" : ""}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!isValid && !error && (
          <p className="text-sm text-destructive">
            Please enter a valid YouTube URL
          </p>
        )}
      </div>
    );
  }
);
