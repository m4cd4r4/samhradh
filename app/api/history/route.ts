import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHistory, deleteSummary, bulkDelete } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);

    const { summaries, total } = await getHistory(
      session.user.id,
      validPage,
      validLimit
    );

    return NextResponse.json({
      summaries,
      total,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Check for bulk delete in body
    const body = await request.json().catch(() => ({}));
    const ids = body.ids as string[] | undefined;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Bulk delete
      await bulkDelete(ids, session.user.id);
      return NextResponse.json({
        success: true,
        deleted: ids.length,
      });
    }

    if (id) {
      // Single delete
      await deleteSummary(id, session.user.id);
      return NextResponse.json({
        success: true,
        deleted: 1,
      });
    }

    return NextResponse.json(
      { error: "No ID or IDs provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("History DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
