import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  let url = "";

  if (q) {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${process.env.NEWS_API_KEY}`;
  } else {
    url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=12&apiKey=${process.env.NEWS_API_KEY}`;
    if (category && category !== "all") {
      url += `&category=${encodeURIComponent(category)}`;
    }
  }

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  return NextResponse.json(data);
}