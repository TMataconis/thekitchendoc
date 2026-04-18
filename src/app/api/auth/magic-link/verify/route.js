import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/api/auth/signin?error=InvalidToken", request.url));
  }

  try {
    await signIn("magic-link", { email, oneTimeToken: token, redirect: false });
    return NextResponse.redirect(new URL("/auth/success", request.url));
  } catch {
    return NextResponse.redirect(new URL("/api/auth/signin?error=InvalidToken", request.url));
  }
}
