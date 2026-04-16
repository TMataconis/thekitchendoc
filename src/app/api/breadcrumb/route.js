import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "/";
  const segments = path.split("/").filter(Boolean);

  const crumbs = [{ label: "Home", href: "/" }];

  if (segments[0] === "categories" && segments[1]) {
    const id = Number(segments[1]);
    const category = await prisma.category.findUnique({ where: { id } });
    if (category) {
      crumbs.push({ label: category.name, href: `/categories/${id}` });
    }
  } else if (segments[0] === "recipes" && segments[1]) {
    const id = Number(segments[1]);
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { category: true },
    });
    if (recipe) {
      crumbs.push({
        label: recipe.category.name,
        href: `/categories/${recipe.category.id}`,
      });
      crumbs.push({ label: recipe.title, href: `/recipes/${id}` });
    }
  } else if (segments[0] === "search") {
    crumbs.push({ label: "Search", href: "/search" });
  } else if (segments[0] === "admin") {
    crumbs.push({ label: "Admin", href: "/admin" });
  }

  return NextResponse.json(crumbs);
}
