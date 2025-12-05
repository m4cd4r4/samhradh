import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchHistory } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ summaries: [] });
    }

    const summaries = await searchHistory(session.user.id, query);

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
