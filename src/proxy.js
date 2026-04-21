import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth(function (req) {
  const { pathname } = req.nextUrl;

  // Recipe routes: pass through unconditionally — the page renders a locked
  // state for unauthenticated visitors rather than bouncing them to sign-in.
  if (pathname.startsWith("/recipes/")) {
    return;
  }

  const session = req.auth;

  if (!session) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Admin routes: use realRole so preview mode never locks out a real ADMIN.
  if (pathname.startsWith("/admin")) {
    const realRole = session.user?.realRole ?? session.user?.role;
    if (realRole !== "ADMIN" && realRole !== "CONTRIBUTOR") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
  }

  // /my-recipes: any authenticated user may enter; pages enforce role limits.
});

export const config = {
  matcher: ["/admin/:path*", "/my-recipes/:path*", "/recipes/:path*"],
};
