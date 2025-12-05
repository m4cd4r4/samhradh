import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/api/auth", "/api/extension"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Extension API - check API key
  if (pathname.startsWith("/api/extension")) {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.EXTENSION_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!req.auth) {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Return 401 for API requests
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
