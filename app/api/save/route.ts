import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getUserId(req: NextRequest) {
  // replace with your own auth strategy; this example reads a header.
  // In production, use secure tokens/cookies and verify them.
  const userId = req.headers.get("x-user-id");
  return userId || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, source, url, imageUrl, category, aiSummary } =
      await req.json();

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const article = await prisma.savedArticle.upsert({
      where: {
        userId_url: {
          userId,
          url,
        },
      },
      update: {
        title,
        description,
        source,
        imageUrl,
        category,
        aiSummary,
      },
      create: {
        userId,
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
  } catch (error) {
    console.error("/api/save POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save article" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const articles = await prisma.savedArticle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(articles, { status: 200 });
  } catch (error) {
    console.error("/api/save GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch saved articles" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    await prisma.savedArticle.delete({
      where: {
        userId_url: {
          userId,
          url,
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("/api/save DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete article" },
      { status: 500 }
    );
  }
}
