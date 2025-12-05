"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Youtube } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Youtube className="h-5 w-5 text-red-500" />
          <span className="hidden sm:inline">YT Summarizer</span>
        </Link>

        <nav className="flex items-center gap-4 ml-6">
          {session && (
            <Link
              href="/history"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {session && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
