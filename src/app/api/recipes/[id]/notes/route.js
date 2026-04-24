import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = Number(id);

  const notes = await prisma.personalNote.findMany({
    where: { recipeId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = Number(id);
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const note = await prisma.personalNote.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      recipeId,
    },
  });

  return NextResponse.json(note);
}
