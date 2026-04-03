import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const articles = await prisma.savedArticle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, articles });
}