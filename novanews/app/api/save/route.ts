import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { title, description, source, url, imageUrl, category, aiSummary } =
      await req.json();

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const article = await prisma.savedArticle.upsert({
      where: { url },
      update: {
        title,
        description,
        source,
        imageUrl,
        category,
        aiSummary,
      },
      create: {
        title,
        description,
        source,
        url,
        imageUrl,
        category,
        aiSummary,
      },
    });

    return NextResponse.json(article, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save article" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const articles = await prisma.savedArticle.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(articles, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch saved articles" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    await prisma.savedArticle.delete({
      where: { url },
    });

async function handleUnsave(article: Article) {
  setSaving(article.url);

  try {
    const res = await fetch("/api/save", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: article.url }),
    });

    if (res.ok) {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(article.url);
        return next;
      });
    }
  } catch {
    // optional: toast error
  } finally {
    setSaving(null);
  }
}
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to unsave article" },
      { status: 500 }
    );
  }
}