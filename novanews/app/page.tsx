"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

type Article = {
  title: string;
  description: string;
  content?: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source?: { name?: string };
};

type SavedArticle = {
  url: string;
};

const categories = [
  "all",
  "technology",
  "science",
  "business",
  "health",
  "sports",
];

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setSaved(new Set());
      return;
    }

    fetch("/api/save")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch saved articles");
        return res.json();
      })
      .then((data: SavedArticle[]) => {
        setSaved(new Set(data.map((a) => a.url)));
      })
      .catch(() => {
        // ignore preload errors for now
      });
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    } else if (category !== "all") {
      params.set("category", category);
    }

    fetch(`/api/news?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, category]);

  const heading = useMemo(() => {
    if (search) return `Results for "${search}"`;
    if (category !== "all") {
      return `${category[0].toUpperCase()}${category.slice(1)} news`;
    }
    return "Global headlines";
  }, [search, category]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(query.trim());
  }

  async function handleSummary(article: Article) {
    setSummarizing(article.url);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          content: article.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSummaries((prev) => ({
          ...prev,
          [article.url]: data.error || "Failed to generate summary.",
        }));
        return;
      }

      setSummaries((prev) => ({
        ...prev,
        [article.url]: data.summary || "No summary available.",
      }));
    } catch {
      setSummaries((prev) => ({
        ...prev,
        [article.url]: "Failed to generate summary.",
      }));
    } finally {
      setSummarizing(null);
    }
  }

  async function handleSave(article: Article) {
    if (!isSignedIn) {
      alert("Please sign in to save articles.");
      return;
    }

    setSaving(article.url);

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          source: article.source?.name,
          url: article.url,
          imageUrl: article.urlToImage,
          category: search ? "search" : category,
          aiSummary: summaries[article.url] || null,
        }),
      });

      if (res.ok) {
        setSaved((prev) => {
          const next = new Set(prev);
          next.add(article.url);
          return next;
        });
      }
    } catch {
      // optional toast later
    } finally {
      setSaving(null);
    }
  }

  async function handleUnsave(article: Article) {
    if (!isSignedIn) return;

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
      // optional toast later
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 opacity-80">
              News Platform
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">NovaNews</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-sm text-slate-400 md:block">
              AI-powered intelligence feed
            </div>

            <Link
              href="/library"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:border-slate-600"
            >
              My Library
            </Link>

            {!isLoaded ? null : !isSignedIn ? (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Sign in
                </button>
              </SignInButton>
            ) : (
              <UserButton />
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4 backdrop-blur-sm md:flex-row md:gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search technology, science, finance..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((item) => {
            const active = category === item && !search;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setCategory(item);
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "border border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:border-slate-600"
                }`}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 opacity-70">
              Feed
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{heading}</h2>
          </div>
          <p className="text-sm text-slate-400">
            {loading ? "Loading..." : `${articles.length} articles`}
          </p>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-700 bg-slate-800/30 p-4"
              >
                <div className="h-44 rounded-lg bg-slate-700/50" />
                <div className="mt-4 h-3 w-24 rounded bg-slate-700/50" />
                <div className="mt-3 h-5 w-full rounded bg-slate-700/50" />
                <div className="mt-2 h-5 w-5/6 rounded bg-slate-700/50" />
                <div className="mt-4 h-3 w-full rounded bg-slate-700/50" />
                <div className="mt-2 h-3 w-4/5 rounded bg-slate-700/50" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900/40 p-12 text-center">
            <h3 className="text-2xl font-bold text-white">No articles found</h3>
            <p className="mt-2 text-slate-400">
              Try another keyword or switch back to global headlines.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.url}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/40 transition hover:border-slate-600 hover:bg-slate-900/60 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="relative overflow-hidden bg-slate-800">
                  {article.urlToImage ? (
                    <img
                      src={article.urlToImage}
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
                    <span className="truncate">{article.source?.name || "Unknown source"}</span>
                    <span className="shrink-0">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-3 text-lg font-bold leading-tight text-white">
                    {article.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
                    {article.description || "No description available."}
                  </p>

                  {summaries[article.url] && (
                    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm leading-relaxed text-slate-300">
                      {summaries[article.url]}
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

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          saved.has(article.url)
                            ? handleUnsave(article)
                            : handleSave(article)
                        }
                        disabled={saving === article.url}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          saved.has(article.url)
                            ? "bg-emerald-600/80 text-white hover:bg-emerald-600"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {saving === article.url
                          ? saved.has(article.url)
                            ? "Removing..."
                            : "Saving..."
                          : saved.has(article.url)
                          ? "Saved"
                          : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSummary(article)}
                        disabled={summarizing === article.url}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {summarizing === article.url
                          ? "AI..."
                          : "Summary"}
                      </button>
                    </div>
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