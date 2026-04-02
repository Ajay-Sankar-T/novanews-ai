"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";

type SavedArticle = {
  id: number;
  title: string;
  description?: string;
  source?: string;
  url: string;
  imageUrl?: string;
  category?: string;
  aiSummary?: string;
  createdAt: string;
};

export default function LibraryPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setArticles([]);
      setLoading(false);
      return;
    }

    fetch("/api/save")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch saved articles");
        return res.json();
      })
      .then((data) => {
        setArticles(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  async function handleUnsave(url: string) {
    setRemoving(url);

    try {
      const res = await fetch("/api/save", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("Failed to unsave");

      setArticles((prev) => prev.filter((article) => article.url !== url));
    } catch {
      // optional: toast
    } finally {
      setRemoving(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 opacity-80">
              Your Collection
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">My Library</h1>
          </div>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            ← Back to feed
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!isLoaded ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !isSignedIn ? (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-12 text-center">
            <h3 className="text-2xl font-bold text-white">Sign in to view your library</h3>
            <p className="mt-2 text-slate-400">
              Your saved articles are linked to your NovaNews account.
            </p>
            <div className="mt-6 flex justify-center">
              <SignInButton mode="modal">
                <button className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-slate-400">Loading saved articles…</p>
        ) : articles.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-12 text-center">
            <h3 className="text-2xl font-bold text-white">No saved articles yet</h3>
            <p className="mt-2 text-slate-400">
              Save articles from the main feed to build your personal briefing.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/40 transition hover:border-slate-600 hover:bg-slate-900/60 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="relative overflow-hidden bg-slate-800">
                  {article.imageUrl ? (
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="h-48 w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="truncate">{article.source || "Unknown source"}</span>
                    <span className="shrink-0">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-3 text-lg font-bold leading-tight text-white">
                    {article.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
                    {article.description || "No description available."}
                  </p>

                  {article.aiSummary && (
                    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm leading-relaxed text-slate-300">
                      {article.aiSummary}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
                    >
                      Read →
                    </a>

                    <button
                      type="button"
                      onClick={() => handleUnsave(article.url)}
                      disabled={removing === article.url}
                      className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removing === article.url ? "Removing..." : "Unsave"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}