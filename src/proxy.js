import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth(function (req) {
  const { pathname } = req.nextUrl;

  // Recipe routes: pass through unconditionally — the page renders a locked
  // state for unauthenticated visitors rather than bouncing them to sign-in.
  if (pathname.startsWith("/recipes/")) {
    return;
  }

  // Admin routes: require an authenticated ADMIN or CONTRIBUTOR.
  const session = req.auth;

  if (!session) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return new NextResponse("Forbidden", { status: 403 });
  }
});

export const config = {
  matcher: ["/admin/:path*", "/recipes/:path*"],
};
