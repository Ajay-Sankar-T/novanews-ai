
# `app/` Directory · NovaNews (Next.js App Router)

The `app/` directory contains the **application layer** of NovaNews: all routes, layouts, global styles, and server handlers implemented using the **Next.js App Router** architecture. It’s where the UI, API boundaries, and authentication context converge. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

Conceptually, `app/` is:

- The **presentation layer**: React components, layouts, and styling.
- The **edge/API gateway**: Route handlers that wrap external services (News API, LLM API) and internal data access (Prisma + Postgres). [clerk](https://clerk.com/docs/reference/nextjs/app-router/route-handlers)
- The **auth surface**: Pages that consume the Clerk context established by the root layout and guarded by `middleware.ts`. [clerk](https://clerk.com/nextjs-authentication)

The goal is to keep all “web‑facing” behavior close together while delegating deeper persistence concerns to Prisma and Neon.

***

## 1. Directory Layout (with Roles & Flows)

```text
app/
├── layout.tsx             # Root layout for App Router; global providers & shell
├── globals.css            # Global styles & Tailwind base
├── page.tsx               # Home feed: news, categories, search, AI summaries, save
├── library/
│   └── page.tsx           # My Library: per-user saved articles
└── api/
    ├── news/
    │   └── route.ts       # News API proxy
    ├── summary/
    │   └── route.ts       # LLM summary endpoint
    └── save/
        └── route.ts       # SavedArticle CRUD (per user)
```

The App Router treats each folder under `app/` as a **route segment**. Files named `page.tsx` render UI; files named `route.ts` implement HTTP handlers at corresponding paths. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

***

## 2. Root Shell & Global Styling

### 2.1 `layout.tsx` – Application Shell and Providers

This file defines the root UI chrome for all routes in the App Router. It is the canonical place to mount **providers** and **global configuration**. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

Key responsibilities:

1. **Auth provider wiring (Clerk)**

   ```tsx
   import { ClerkProvider } from "@clerk/nextjs";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <ClerkProvider>
         <html ...>
           <body>{children}</body>
         </html>
       </ClerkProvider>
     );
   }
   ```

   - Mounts `ClerkProvider` at the root so all client components can use hooks like `useAuth`, `useUser`, `useSession`, `SignInButton`, and `UserButton`. [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)
   - Aligns with Clerk’s App Router quickstart pattern. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

2. **Fonts & typography**

   - Uses `next/font/google` to load the Geist font pair (sans + mono).
   - Exposes them via CSS variables (`--font-geist-sans`, `--font-geist-mono`) attached to `<html>` class, following Next’s recommended font integration. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

3. **Hydration mismatch handling**

   - Adds `suppressHydrationWarning` on `<html>`:

     ```tsx
     <html
       lang="en"
       suppressHydrationWarning
       className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
     >
     ```

   - This is specifically to handle cases where browser extensions inject attributes like `data-qb-installed`, causing React hydration mismatches. [nextjs](https://nextjs.org/docs/messages/react-hydration-error)

4. **Document metadata**

   - Exports a `metadata` object:

     ```tsx
     export const metadata: Metadata = {
       title: "NovaNews",
       description: "AI-powered news dashboard with summaries and saved articles",
     };
     ```

   - Used by Next.js for `<head>` management and SEO‑friendly defaults. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

Meta‑note: `layout.tsx` is intentionally thin; its role is to wire providers and apply consistent structural classes, not to introduce business logic.

***

### 2.2 `globals.css` – Design System Surface

`globals.css` is the place where the otherwise abstract design system meets the real DOM:

- Tailwind’s `@tailwind base; @tailwind components; @tailwind utilities;` (imported via next’s Tailwind preset). [aceternity](https://aceternity.com/blog/how-to-create-a-modern-card-design-with-tailwindcss-and-nextjs)
- Global resets and tokens:
  - Background color, text color, base font size, and line height.
  - Shared classes for card shadows, border radii, and transitions.

The philosophy here is:

- Use **Tailwind utilities** for specific layout/class composition on components.
- Use `globals.css` for:
  - One‑off fixups (e.g., scrollbars, selection colors).
  - Shared “design atoms” that don’t fit neatly into atomic class composition.

***

## 3. Page Components

### 3.1 `page.tsx` – Home Feed (“NovaNews”)

`app/page.tsx` is the main client‑side entrypoint for the NovaNews experience. It implements the entire “AI‑Enhanced Intelligence Portal” brief in a single cohesive screen:

- **News integration** (fetch from a News API via `/api/news`).
- **Search & categories** (filter by keywords and topic).
- **AI summaries** (per‑article, two‑sentence LLM output).
- **Save/unsave** (write to Postgres, per user).
- **Auth‑aware UI** (sign‑in glamor and multi‑user separation).

It is explicitly marked as a **client component** (`"use client";`) because it manages local state and performs side‑effectful `fetch` calls on the browser side.

#### 3.1.1 State model

The component maintains several state domains:

```tsx
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
```

Conceptual breakdown:

- **News domain**: `articles`, `loading`, `query`, `search`, `category`.
- **AI domain**: `summaries`, `summarizing`.
- **Persistence domain**: `saved`, `saving`.
- **Auth domain**: `useAuth()` from Clerk, describing session state. [clerk](https://clerk.com/docs/nextjs/guides/users/reading)

This layering is important: it keeps the concerns separable while still living in one page component.

#### 3.1.2 News fetching pipeline

News is fetched based on the combo of `search` and `category`. When either changes, a `useEffect` triggers:

```tsx
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
```

Design decisions:

- The **client side** decides the filters, the **server side** (in `/api/news`) decides how those map to the external News API.
- `URLSearchParams` ensures query strings are clean and easily extendable in the future.

This pattern is aligned with standard Next.js “client fetch to server route handler to external API” flows. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)

#### 3.1.3 AI summary pipeline

For each article:

- Clicking **AI Summary** calls `handleSummary(article)`:

  ```tsx
  async function handleSummary(article: Article) {
    setSummarizing(article.url);
    try {
      const res = await fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: article.title, description: article.description, content: article.content }) });

      const data = await res.json();

      if (!res.ok) {
        setSummaries((prev) => ({ ...prev, [article.url]: data.error || "Failed to generate summary." }));
        return;
      }

      setSummaries((prev) => ({ ...prev, [article.url]: data.summary || "No summary available." }));
    } catch {
      setSummaries((prev) => ({ ...prev, [article.url]: "Failed to generate summary." }));
    } finally {
      setSummarizing(null);
    }
  }
  ```

- The `summaries` state is keyed by article URL, which naturally deduplicates articles across pages or updates.
- `summarizing` holds the URL currently being processed, allowing the button label to display “Summarizing…” only for the relevant card.

On the server side, `/api/summary` speaks to the LLM endpoint with a “two‑sentence summary” prompt. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)

#### 3.1.4 Save/unsave pipeline

Saving:

- The page is **auth‑aware** but still calls a server endpoint; it does not directly talk to Prisma:

  ```tsx
  async function handleSave(article: Article) {
    if (!isSignedIn) {
      alert("Please sign in to save articles.");
      return;
    }

    setSaving(article.url);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } finally {
      setSaving(null);
    }
  }
  ```

Unsaving:

- Similar pattern, but calling `DELETE /api/save` with `{ url }` and removing from the local `saved` set on success.

This closely matches patterns in full‑stack examples combining Next.js, Prisma, and Clerk. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

#### 3.1.5 Auth‑aware header

The header uses `useAuth()` to conditionally render sign‑in vs user avatar:

```tsx
const { isLoaded, isSignedIn } = useAuth();

{!isLoaded ? null : !isSignedIn ? (
  <SignInButton mode="modal">
    <button>Sign in</button>
  </SignInButton>
) : (
  <UserButton />
)}
```

This keeps the header consistent with Clerk’s recommended client pattern but avoids reliance on `SignedIn` / `SignedOut` exports (which had version mismatches). [clerk](https://clerk.com/nextjs-authentication)

#### 3.1.6 UI/UX: cards, skeletons, states

- The feed uses a **grid of cards**, heavily inspired by card design best practices: clear hierarchy, consistent metadata location, balanced whitespace. [herodot](https://www.herodot.com/blog/news-cards-design)
- Skeleton loaders are rendered in place of cards while `loading` is true, using animated gray blocks that mirror the eventual structure.
- Edge states:
  - Empty results show a friendly “No articles found” box.
  - Summaries and saves gracefully degrade on error without breaking the card.

***

### 3.2 `library/page.tsx` – My Library

`app/library/page.tsx` is the authenticated view for a user’s saved articles.

It is also a **client component** because it:

- Uses `useAuth()` to read session state.
- Performs `fetch` calls to `/api/save`.
- Manages local UI state for loading/removing.

#### 3.2.1 Auth‑driven control flow

On mount:

- It waits for `isLoaded` from `useAuth()` to avoid flashing the wrong UI.
- Behavior branches:

  ```tsx
  if (!isLoaded) {
    // show "Loading…"
  } else if (!isSignedIn) {
    // show "Sign in to view your library" + SignInButton
  } else {
    // fetch /api/save and render cards
  }
  ```

This is UI‑level protection. The real security is enforced by `middleware.ts` on `/library` and `/api/save`, which uses `auth.protect()` to ensure only authenticated users can reach these endpoints. [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)

#### 3.2.2 Data fetching

The page fetches saved articles once `isSignedIn` is true:

```tsx
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
```

The backend uses Clerk’s `auth()` to ensure only the current user’s rows from the `SavedArticle` table are returned. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

#### 3.2.3 Unsave behavior

- The page tracks `removing` by URL.
- When “Unsave” is clicked:

  ```tsx
  async function handleUnsave(url: string) {
    setRemoving(url);
    try {
      const res = await fetch("/api/save", { method: "DELETE", ...body: JSON.stringify({ url }) });
      if (!res.ok) throw new Error("Failed to unsave");
      setArticles((prev) => prev.filter((article) => article.url !== url));
    } finally {
      setRemoving(null);
    }
  }
  ```

- This keeps the UI responsive and avoids a full reload.

#### 3.2.4 Card layout and data presentation

The Library cards largely mirror home feed cards but differ in semantics:

- Show `createdAt` (when the user saved it) rather than the article’s publication date.
- Use the stored `aiSummary` field (if present) to display previously generated summaries without re‑calling the LLM. This is important for cost and consistency.

***

## 4. API Layer (`app/api/**/route.ts`)

The `app/api` subtree houses Next.js **Route Handlers**, which are essentially standalone HTTP endpoints. They:

- Isolate external integration logic.
- Hide API keys.
- Bridge between external services and the Prisma layer. [clerk](https://clerk.com/docs/reference/nextjs/app-router/route-handlers)

### 4.1 `api/news/route.ts` – News Proxy

Role:

- Accepts `GET /api/news` requests with optional `q` (search) and `category` params.
- Calls an external News API (e.g., NewsAPI, GNews), using `NEWS_API_KEY`.
- Normalizes the response shape into `articles[]` that match the `Article` type used in `page.tsx`. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)

Why a proxy?

- Keeps the News API key off the client.
- Allows the app to:
  - Switch providers without touching frontend code.
  - Implement caching and normalization centrally.

### 4.2 `api/summary/route.ts` – LLM Summarization

Role:

- Handles `POST /api/summary` with JSON body containing article data.
- Constructs a prompt that obeys the guild’s “two‑sentence overview” rule.
- Calls the LLM provider API with `LLM_API_KEY` (Gemini style). [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)
- Returns a JSON payload:

  ```json
  { "summary": "Two sentences..." }
  ```

Implementation notes:

- Can sanitize/trim input for safety.
- Can enforce 2 sentences by splitting on `.`, taking the first 2, and rejoining.

This pattern is consistent with guidance on encapsulating LLM calls on the server in Next.js apps. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)

### 4.3 `api/save/route.ts` – Saved Articles CRUD

Role:

- Manages `SavedArticle` records for each user, backed by Prisma and Postgres. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

Auth:

- Uses `auth()` from `@clerk/nextjs/server` to get `userId` and enforce that queries are scoped to the current user. [clerk](https://clerk.com/docs/reference/nextjs/app-router/auth)

Endpoints:

- `GET /api/save`:
  - Returns all `SavedArticle` where `userId` equals the current user’s ID.

- `POST /api/save`:
  - Accepts an article payload and optional `aiSummary`.
  - Inserts or upserts a record into the `SavedArticle` table.

- `DELETE /api/save`:
  - Accepts `{ url }`.
  - Deletes the row with matching `userId` and `url`.

This is the key connector between:

- The **UI** (save/unsave buttons).
- The **auth** layer (Clerk).
- The **data** layer (`schema.prisma`, Neon Postgres).

***

## 5. Interactions with External Layers

Although this README is scoped to `app/`, it’s useful to see how this folder depends on other parts of the repo:

- **`middleware.ts` (root):**
  - Uses `clerkMiddleware` to enforce `auth.protect()` on `/library` and `/api/save`. [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)
  - `app/library/page.tsx` and `app/api/save/route.ts` assume they will only see signed‑in users because of this.

- **`prisma/schema.prisma`:**
  - Defines the `SavedArticle` model that `/api/save` queries.
  - Migrations applied to Neon via `prisma migrate dev` and `prisma migrate deploy`. [neon](https://neon.com/docs/get-started/signing-up)

- **Neon console:**
  - Used to verify rows created by `/api/save` (via Tables view / SQL editor). [neon](https://neon.com)

- **Tailwind & PostCSS config:**
  - Provide the Tailwind utilities consumed in `page.tsx` and `library/page.tsx`. [flowbite](https://flowbite.com/docs/components/card/)

***

## 6. Patterns & Principles

The `app/` folder embodies several architectural and UX principles:

1. **Colocation of UI and behavior**

   - Pages (home, library) live next to their corresponding backend endpoints (news, summary, save) under the same URL layout.
   - This is aligned with current Next.js guidance on colocating UI and data logic. [clerk](https://clerk.com/docs/reference/nextjs/app-router/route-handlers)

2. **Server as the integration boundary**

   - All third‑party integrations (News API, LLM, Prisma) are called from route handlers, not from browser code.
   - This keeps keys secret and allows central error handling.

3. **Auth‑aware but auth‑agnostic UI**

   - Components use `useAuth()` and Clerk UI elements (`SignInButton`, `UserButton`), but do not rely on specific providers (Google/GitHub/email). [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)
   - The backend uses `auth()` + `userId`, independent of how the user signed in.

4. **Card‑centric interaction design**

   - Both the feed and library are composed of cards with consistent structure:
     - Image → meta (source/date) → title → description → AI summary → actions.
   - This pattern follows recommended card UX practices and modern news/dashboard examples. [uxdesign](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc)

5. **Incremental enhancement**

   - Home and Library function even if AI summary fails: the user still has links and saved items.
   - Auth‑free users still get a fully functional news feed; saved data and library are graceful add‑ons.

***

## 7. When You Modify `app/` (Guidance)

- **Change global layout, meta, or providers** → `layout.tsx`.
- **Adjust global styles or tokens** → `globals.css`.
- **Change feed behavior (filters, AI summary, save logic)** → `page.tsx` and `api/news` / `api/summary` / `api/save`.
- **Change saved‑articles behavior** → `library/page.tsx` and `api/save`.
- **Switch or reconfigure external services**:
  - News API → `api/news/route.ts`.
  - LLM provider → `api/summary/route.ts`.
  - Database shape → `schema.prisma` (outside `app/`) plus `api/save/route.ts`.

This README is intended as a **map of the application layer**: it explains not just file names, but how data, auth, external APIs, and UI all flow through `app/` in a structured, Next.js‑idiomatic way.
