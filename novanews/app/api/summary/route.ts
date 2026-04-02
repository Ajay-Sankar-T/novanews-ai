import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, description, content } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = `
You are a news assistant.

Write a concise summary of the article in natural English.
Use 2 to 3 full sentences, not a headline.
Do not invent any details beyond what is given.

Title: ${title || ""}
Description: ${description || ""}
Content: ${content || ""}
`.trim();

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 220,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gemini request failed" },
        { status: 500 }
      );
    }

    let raw =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || "";

    // Fallback if model returns a fragment or is too short
    if (!raw || raw.split(" ").length < 10 || !raw.includes(".")) {
      // Build a very basic fallback from title + description
      const pieces = [title, description].filter(Boolean);
      raw = pieces.join(". ") || "Summary generation failed.";
    }

    const summary = raw.trim();

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error", details: String(error) },
      { status: 500 }
    );
  }
}