# NovaNews · AI‑Enhanced Intelligence Portal

NovaNews is a full‑stack, personalized news dashboard with AI‑generated overviews and a private saved library. It was built for the **AI & Software Guild — Software Development Recruitment 2026** technical project, following their specification for an *“AI‑Enhanced Intelligence Portal”* built on modern web technologies.

The application combines:

- A **Next.js App Router** frontend for a fast, app‑like experience. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)
- **Clerk** for secure, multi‑user authentication. [clerk](https://clerk.com/nextjs-authentication)
- **Prisma + PostgreSQL** for typed, relational persistence. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)
- A **News API** and **LLM API** for live content and AI summaries. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)

***

## 1. Project Overview

### 1.1 Problem

News feeds are noisy. Users skim dozens of headlines, open multiple tabs, and still miss key ideas. The guild brief suggests a system that can:

- Surface global headlines.
- Let users focus on specific domains (e.g., technology, finance).
- Provide fast AI overviews instead of long article reads.
- Persist interesting items into a private library.

### 1.2 Concept

NovaNews is positioned as a **personal intelligence console**:

- The **Home feed** behaves like a news terminal, with category filters and keyword search.
- Each article has an **AI Summary** button that calls a language model to generate a concise, two‑sentence overview.
- Authenticated users save articles into **My Library**, where stored AI summaries and metadata are available later.

This design is influenced by card‑based news UX guidelines  and dashboard color/structure advice used in analytics products. [herodot](https://www.herodot.com/blog/news-cards-design)

***

## 2. Tech Stack (With Rationale & Links)

The stack was chosen to align with the guild’s suggested options and modern production patterns.

### 2.1 Frontend & App Framework

- **Next.js 16 (App Router)** – React framework with file‑based routing, server components, and first‑class support for edge functions and route handlers. [Next.js App Router docs] [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)
- **React 19** – UI library for components and hooks.
- **Tailwind CSS** – Utility‑first styling enabling fast iteration on card layouts and responsive design, following patterns similar to those used in modern Tailwind card tutorials. [aceternity](https://aceternity.com/blog/how-to-create-a-modern-card-design-with-tailwindcss-and-nextjs)

### 2.2 Authentication

- **Clerk for Next.js** – Handles OAuth providers, email/password, session management, and user interface components. [Clerk Next.js docs] [clerk](https://clerk.com/nextjs-authentication)
- References that heavily influenced the integration:
  - Clerk + Next.js + Prisma guides. [dev](https://dev.to/alexisintech/create-a-nextjs-app-with-clerk-prisma-trpc-tanstack-query-zod-tailwind-ipi)
  - Official App Router quickstart showing `ClerkProvider` and hooks usage. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

### 2.3 Backend / API Layer

- **Next.js Route Handlers** in `app/api/**/route.ts` are used as a light backend:
  - `app/api/news/route.ts` – proxy to an external News API.
  - `app/api/summary/route.ts` – proxy to an LLM API (e.g., Gemini) that returns a summary. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)
  - `app/api/save/route.ts` – CRUD interface for the `SavedArticle` table. [clerk](https://clerk.com/docs/reference/nextjs/app-router/route-handlers)

This mirrors patterns in Next.js + Prisma tutorials where all backend logic is colocated with the app. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

### 2.4 Database & ORM

- **PostgreSQL** – Relational SQL database, matching the guild requirement. Hosted DB services like Neon or Supabase work well here.
- **Prisma ORM** – Provides:
  - A schema definition in `prisma/schema.prisma`.
  - Type‑safe client for Postgres queries.
  - Migrations stored under `prisma/migrations`. [Prisma guides for Clerk & Next] [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

### 2.5 External APIs

- **News API** – Any REST‑style news provider that returns headline lists.
  - The app uses a proxy route (`/api/news`) to centralize key usage and normalization. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)
- **LLM API (Gemini or compatible)** – A generative model with HTTP API (e.g., Google Gemini) is used for summaries.
  - Prompting is constrained to exactly two sentences to fulfill the brief. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)

***

## 3. Guild Requirements → Implementation Details

This section maps each line of the **AI & Software Guild** prompt to concrete implementation decisions.

### 3.1 Tech Stack Alignment

**Guild expectation:**

- Frontend: ReactJS | NextJS | VueJS | Flutter | React Native  
- Backend: ExpressJS | FastAPI | Flask | Django  
- Database: PostgreSQL (SQL)  
- APIs: Any News API + Any LLM API (e.g. Gemini)

**NovaNews implementation:**

- Frontend/App: **Next.js (React)**. [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)
- Backend: **Next.js Route Handlers** (equivalent to a lightweight Express‑style backend colocated in the same repo). [clerk](https://clerk.com/docs/reference/nextjs/app-router/route-handlers)
- Database: **PostgreSQL**, accessed via Prisma models with migrations. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)
- APIs:
  - News: external REST provider proxied via `/api/news`. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)
  - LLM: Gemini‑style endpoint called in `/api/summary`. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)

The result is a cohesive full‑stack TypeScript application that matches both the letter and spirit of the expected technology choices.

***

### 3.2 News Integration

**Prompt:**

- “Home Screen that fetches and displays the latest global headlines using a News API.”  
- “Search functionality that allows users to filter news by specific categories or keywords.”

**Implementation:**

- `app/page.tsx` is a client component managing news state:

  ```tsx
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  ```

- On mount and when `search` or `category` change, it calls:

  ```tsx
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  else if (category !== "all") params.set("category", category);

  fetch(`/api/news?${params.toString()}`)
  ```

- Categories are rendered as pill buttons:

  ```tsx
  const categories = ["all","technology","science","business","health","sports"];
  ```

- The card layout follows news card best practices (clear hierarchy, image prominence, concise text) inspired by publications on news card design. [uxplanet](https://uxplanet.org/best-practices-for-cards-fa45e3ad94dd)

***

### 3.3 AI Implementation

**Prompt:**

- “Integrate an AI API (such as Google Gemini) to provide an AI Overview feature.”  
- “Users should be able to click a button on any news card to receive a concise, 2‑sentence summary of that specific article.”  
- “Each news card must include a link redirecting the user to the full original article.”

**Implementation:**

- Each article card includes:
  - A `Read full article` link with `target="_blank"` and `rel="noopener noreferrer"` to the original URL.
  - An **AI Summary** button that calls `handleSummary(article)`.

- `handleSummary`:

  ```tsx
  async function handleSummary(article: Article) {
    setSummarizing(article.url);

    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        description: article.description,
        content: article.content,
      }),
    });
    const data = await res.json();
    // store in summaries[article.url]
  }
  ```

- `/api/summary` constructs an LLM prompt along the lines of:

  > “Summarize the following news article in **exactly two sentences**, neutral tone, no bullet points, no headings.”

  and returns `{ summary }`. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)

- Summaries are cached in local state keyed by article.url:

  ```tsx
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  ```

This architecture isolates the LLM integration inside a single route handler, similar to patterns recommended in AI‑powered Next.js tutorials. [youtube](https://www.youtube.com/watch?v=q6ZzkbhGQEU)

***

### 3.4 Authentication & User Accounts

**Prompt:**

- “Implement a secure Authentication system (OAuth via Google/GitHub, or standard Email/Password).”
- “The application must support multiple users, each with their own private session.”

**Implementation:**

- **Global auth context:**
  - `app/layout.tsx` wraps the entire app in `<ClerkProvider>`:

    ```tsx
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

- **Home header:**
  - Uses `useAuth()` from `@clerk/nextjs`:

    ```tsx
    const { isLoaded, isSignedIn } = useAuth();
    ```

  - Renders:
    - A `SignInButton` when `!isSignedIn`.
    - A `UserButton` (avatar/user menu) when `isSignedIn`. [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)

- **Route protection:**
  - `middleware.ts` uses `clerkMiddleware` and `createRouteMatcher` to guard `/library` and `/api/save`:

    ```ts
    const isProtectedRoute = createRouteMatcher([
      "/library(.*)",
      "/api/save(.*)",
    ]);

    export default clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    });
    ```

  - This ensures that only authenticated users can access the library page and save API routes, following Clerk’s recommended middleware setup. [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)

Because Clerk manages OAuth providers and session cookies under the hood, the app inherits secure, multi‑user session handling without reinventing login flows. [stackoverflow](https://stackoverflow.com/questions/79181868/errorclerk-useauth-called-in-static-mode-wrap-this-component-in-clerkprovi)

***

### 3.5 Database Integration & My Library

**Prompt:**

- “Integrate a SQL database to allow authenticated users to save articles to their profile.”
- “Create a ‘My Library’ / ‘Saved’ section where users can view their bookmarked news and associated AI summaries.”

**Implementation:**

- **Database schema (`prisma/schema.prisma`):**

  ```prisma
  model SavedArticle {
    id        Int      @id @default(autoincrement())
    userId    String   // Clerk user ID
    title     String
    description String?
    source    String?
    url       String
    imageUrl  String?
    category  String?
    aiSummary String?
    createdAt DateTime @default(now())

    @@index([userId])
    @@unique([userId, url])
  }
  ```

- **Saving from the home feed (`app/page.tsx`):**

  ```tsx
  async function handleSave(article: Article) {
    if (!isSignedIn) {
      alert("Please sign in to save articles.");
      return;
    }

    await fetch("/api/save", {
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
  }
  ```

- **Server logic in `/api/save`:**

  - `GET`:
    - Uses `auth()` from `@clerk/nextjs/server` to get `userId`. [clerk](https://clerk.com/docs/reference/nextjs/app-router/auth)
    - Fetches only the current user’s records: `findMany({ where: { userId } })`.
  - `POST`:
    - Requires a valid `userId`.
    - Inserts or upserts a `SavedArticle` row.
  - `DELETE`:
    - Deletes `SavedArticle` where both `userId` and `url` match.

- **My Library page (`app/library/page.tsx`):**

  - Uses `useAuth()` and conditional rendering:

    ```tsx
    if (!isLoaded) { /* loading state */ }
    else if (!isSignedIn) { /* sign-in prompt */ }
    else { /* fetch and render saved articles */ }
    ```

  - Displays cards similar to the home feed but with:
    - `createdAt` date.
    - Stored `aiSummary`, if present.
    - An “Unsave” button that calls `DELETE /api/save`.

This structure follows patterns from Prisma + Clerk full‑stack examples where user data is tightly scoped by `userId`. [dev](https://dev.to/alexisintech/create-a-nextjs-app-with-clerk-prisma-trpc-tanstack-query-zod-tailwind-ipi)

***

### 3.6 Deployment

**Prompt:**

- “Deploy the application using platforms such as Vercel, Netlify, or Render.”

**Implementation plan (Vercel):**

- Repository: `https://github.com/Ajay-Sankar-T/novanews-ai` (once pushes succeed using a Personal Access Token, per GitHub’s new rules). [stackoverflow](https://stackoverflow.com/questions/29297154/github-invalid-username-or-password)
- On Vercel:
  - Import GitHub repo, letting Vercel auto‑detect Next.js. [clerk](https://clerk.com/nextjs-authentication)
  - Configure environment variables:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
    - `NEWS_API_KEY`, `LLM_API_KEY`.
    - `DATABASE_URL` for Postgres.
  - Run `npx prisma migrate deploy` (either via build hooks or externally) to apply schema. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)
- The final Vercel URL can be linked back in this README as the live demo.


***

### 3.7 Database Hosting & Neon Console

NovaNews uses **Neon** as the hosted PostgreSQL provider. Neon is a serverless Postgres platform with branching and a browser‑based console. [neon](https://neon.com)

#### How Neon fits into NovaNews

- A Neon **project** holds the Postgres database used by Prisma.
- The project’s connection string is used as `DATABASE_URL` in both local `.env` and Vercel environment variables.
- Prisma migrations (`prisma migrate dev` / `prisma migrate deploy`) apply the schema to the Neon database. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

#### Using the Neon Console for NovaNews

You can manage and inspect your data through the Neon web console:

- **Project overview:**  
  After logging in at [neon.com](https://neon.com), the dashboard shows your database project, branches, and usage. [neon](https://neon.com/docs/get-started/signing-up)

- **Getting the connection string:**  
  Inside a project, click **“Connect”** to open the connection dialog and copy the `postgresql://...` URL. This is what you place into `DATABASE_URL` for Prisma and Vercel. [neon](https://neon.com/docs/connect/query-with-psql-editor)

- **SQL Editor:**  
  The console provides an in‑browser SQL editor. You can run queries like:

  ```sql
  SELECT * FROM "SavedArticle" ORDER BY "createdAt" DESC;
  ```

  to verify that saved articles from `/api/save` are being persisted correctly. [neon](https://neon.com/docs/guides/tables)

- **Tables View / Data Explorer:**  
  The **Tables** or database explorer view lets you:
  - Browse tables derived from `schema.prisma`, including `SavedArticle`.
  - Inspect or edit individual rows.
  - Check indexes and constraints (e.g., the unique constraint on `(userId, url)`). [neon](https://neon.com/docs/guides/draxlr)

- **Branching (optional):**  
  Neon supports branching databases (e.g., `dev` and `prod`) from the console. You can have:
  - A development branch for local testing.
  - A production branch wired to Vercel. [neon](https://neon.com/use-cases/serverless-apps)

In practice, the Neon console becomes the “database control room” for NovaNews: one place to check connection settings, inspect data, and debug anything related to saved articles or migrations.

## 4. Architecture & File Layout (With Commentary)

Inspired by full‑stack project structures discussed in guides on writing professional READMEs. [coding-boot-camp.github](https://coding-boot-camp.github.io/full-stack/github/professional-readme-guide/)

```text
novanews-ai/
├── app/
│   ├── layout.tsx          # Root layout, fonts, ClerkProvider, global styles
│   ├── page.tsx            # Home feed: news, search, AI summaries, save
│   └── library/
│       └── page.tsx        # My Library: saved articles per user
│
├── app/api/
│   ├── news/
│   │   └── route.ts        # News API proxy
│   ├── summary/
│   │   └── route.ts        # LLM summarization endpoint
│   └── save/
│       └── route.ts        # Save/list/delete SavedArticle for current user
│
├── prisma/
│   ├── schema.prisma       # Prisma models (SavedArticle, etc.)
│   └── migrations/         # SQL migrations
│
├── middleware.ts           # Clerk route protection for /library, /api/save
├── package.json            # Dependencies and scripts
└── README.md               # This document
```

***

## 5. Challenges, Fixes, and Lessons

This project doubled as a mini incident log for common real‑world integration problems.

### 5.1 Clerk component imports & API drift

- **Problem:** Using `SignedIn` / `SignedOut` from examples that didn’t match the installed version produced import errors and runtime crashes.
- **Fix:** Dropped the version‑specific helpers and relied on `useAuth()`, `SignInButton`, and `UserButton` only, following generic patterns in Clerk’s hook docs. [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)
- **Lesson:** Keep an eye on SDK versions and cross‑check with the latest docs instead of copying older blog snippets.

### 5.2 Hydration mismatches from browser extensions

- **Problem:** React hydration mismatch with attributes like `data-qb-installed="true"` on `<html>`, caused by a browser extension mutating the DOM. [nextjs](https://nextjs.org/docs/messages/react-hydration-error)
- **Fix:** Added `suppressHydrationWarning` to `<html>` in `layout.tsx`, as recommended in React/Next hydration error guides. [dev](https://dev.to/ramunarasinga/suppresshydrationwarning-what-is-it-2edd)
- **Lesson:** Not all hydration errors are your fault; sometimes extensions inject attributes. Use the documented escape hatch judiciously.

### 5.3 Evolving Clerk middleware API

- **Problem:** Using `auth().protect()` in `middleware.ts` led to `auth(...).protect is not a function` because the new API expects `auth.protect()`. [sitepoint](https://www.sitepoint.com/community/t/typeerror-auth-protect-is-not-a-function/467779)
- **Fix:** Rewrote middleware as:

  ```ts
  export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  });
  ```

- **Lesson:** Middleware and auth libraries change; always validate against the official reference. [buildwithmatija](https://www.buildwithmatija.com/blog/clerk-authentication-nextjs15-app-router)

### 5.4 Next.js 16 middleware deprecation

- **Problem:** Next.js 16 warns “The `middleware` file convention is deprecated. Please use `proxy` instead.” [clerk](https://clerk.com/blog/what-is-middleware-in-nextjs)
- **Fix:** Acknowledged it as non‑blocking, stayed on `middleware.ts` because Clerk’s own Next.js integration still targets that convention at the time. [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- **Lesson:** Frameworks deprecate APIs before removing them; watch both Next.js and Clerk blogs for migration timelines.

### 5.5 Git and GitHub on Windows

Multiple small but realistic issues:

- Line endings: “LF will be replaced by CRLF” warnings due to default Git settings on Windows. [stackoverflow](https://stackoverflow.com/questions/5834014/lf-will-be-replaced-by-crlf-in-git-what-is-that-and-is-it-important)
- Branch naming: `src refspec main does not match any` when trying to push a branch that doesn’t exist locally. [stackoverflow](https://stackoverflow.com/questions/4181861/message-src-refspec-master-does-not-match-any-when-pushing-commits-in-git)
- Remote configuration: `fatal: 'origin' does not appear to be a git repository` before adding the GitHub URL. [stackoverflow](https://stackoverflow.com/questions/15637507/fatal-origin-does-not-appear-to-be-a-git-repository)
- HTTPS auth: “Invalid username or token. Password authentication is not supported for Git operations” when using account password instead of a **Personal Access Token (PAT)**. [github](https://github.com/orgs/community/discussions/55852)

Fixes included:

- Configuring the remote with `git remote add origin <url>`. [geeksforgeeks](https://www.geeksforgeeks.org/git/how-to-add-remote-origin-in-git/)
- Using `git branch -M main` to standardize branch name. [anandwadsinge.hashnode](https://anandwadsinge.hashnode.dev/git-src-refspec-main-does-not-match-any)
- Creating a PAT on GitHub and using it as the “password” for `git push`. [blog.devops](https://blog.devops.dev/remote-authentication-using-personal-access-tokens-on-github-com-e707646d2f8b)
- Cleaning stored credentials in Windows Credential Manager when necessary. [stackoverflow](https://stackoverflow.com/questions/17659206/git-push-results-in-authentication-failed)

Useful references on these topics:

- GitHub’s own docs on line endings, PATs, and CLI auth. [docs.github](https://docs.github.com/en/get-started/git-basics/configuring-git-to-handle-line-endings)
- Community discussions on recurring auth issues. [github](https://github.com/orgs/community/discussions/133133)

***

## 6. Commands & Scripts Learned / Used

A non‑exhaustive cheat‑sheet:

### 6.1 Project & Dev

```bash
# Install deps
npm install

# Dev server
npm run dev

# Build & run production
npm run build
npm run start

# Lint
npm run lint
```

### 6.2 Prisma & Database

```bash
# Create and apply a migration locally
npx prisma migrate dev --name init

# Apply migrations to production DB
npx prisma migrate deploy

# Inspect schema & data
npx prisma studio
```

Based on Prisma’s recommended workflow for Next.js apps. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

### 6.3 Git & GitHub

```bash
# Status & history
git status
git log --oneline -1

# Branch management
git branch
git branch -M main

# Remote config
git remote -v
git remote add origin https://github.com/Ajay-Sankar-T/novanews-ai.git

# Push with upstream
git push -u origin main
```

Auth is handled with a GitHub Personal Access Token, as required since GitHub disabled password auth for Git over HTTPS. [stackoverflow](https://stackoverflow.com/questions/29297154/github-invalid-username-or-password)

***

## 7. Installation & Local Setup

### 7.1 Prerequisites

- Node.js LTS.
- A running PostgreSQL instance (or a hosted Postgres DB URL).
- API keys:
  - `NEWS_API_KEY`
  - `LLM_API_KEY` (Gemini/OpenAI‑compatible).
  - Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

### 7.2 Setup Steps

```bash
git clone https://github.com/Ajay-Sankar-T/novanews-ai.git
cd novanews-ai

npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEWS_API_KEY=...
LLM_API_KEY=...

DATABASE_URL=postgresql://user:password@host:port/dbname
```

Run migrations and start:

```bash
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000` in the browser.

***

## 8. Future Directions

Ideas inspired by articles on dashboard UX and personalization. [insightsoftware](https://insightsoftware.com/blog/dashboard-color-palette-advice-for-branding-your-analytics/)

- **AI Briefing bar:** A single, LLM‑generated summary at the top of the page describing “Today’s key themes” across the current result set.
- **Topic personalization:** User settings to prioritize categories (e.g., more tech/less sports).
- **Notifications:** Email or in‑app alerts for new articles matching saved keywords.
- **Analytics:** Simple charts showing reading/saving habits, using a charting library (e.g. Chart.js or Recharts). [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)
- **UI theming:** Expand the dark mode palette using tools like [Colormind] or other color scheme resources. [bootstrapdash](https://www.bootstrapdash.com/blog/best-color-schemes-for-websites)

***

## 9. References & Reading List

- **Next.js:**
  - [Next.js App Router Quickstart] [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)
- **Clerk:**
  - [Clerk Next.js authentication overview] [clerk](https://clerk.com/nextjs-authentication)
  - [Clerk middleware reference] [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)
  - [Clerk hooks (`useAuth`, `useSession`)] [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)
- **Prisma:**
  - [Prisma + Clerk + Next.js guides] [clerk](https://clerk.com/blog/build-a-blog-with-trpc-prisma-nextjs-clerk)
- **News & Card UI:**
  - [7 Tips To Design Better News Cards] [herodot](https://www.herodot.com/blog/news-cards-design)
  - [8 Best Practices for UI Card Design] [uxdesign](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc)
  - [Card UI best practices and examples] [mockplus](https://www.mockplus.com/blog/post/card-ui-design)
- **Color & Dashboard UX:**
  - [Top admin/dashboard color schemes] [bootstrapdash](https://www.bootstrapdash.com/blog/best-color-schemes-for-websites)
  - [Dashboard color palette advice] [insightsoftware](https://insightsoftware.com/blog/dashboard-color-palette-advice-for-branding-your-analytics/)
  - [Colormind – AI color palette generator] [colormind](http://colormind.io)
- **README / Documentation:**
  - [Professional README guide] [coding-boot-camp.github](https://coding-boot-camp.github.io/full-stack/github/professional-readme-guide/)
  - [How to write a great README] [dbader](https://dbader.org/blog/write-a-great-readme-for-your-github-project)
  - [Full‑stack project README example] [github](https://github.com/ga-wdi-boston/full-stack-project/blob/master/README.md)
- **Git & GitHub:**
  - [Handling line endings in Git/GitHub] [stackoverflow](https://stackoverflow.com/questions/5834014/lf-will-be-replaced-by-crlf-in-git-what-is-that-and-is-it-important)
  - [Fixing “src refspec main/master does not match any”] [freecodecamp](https://www.freecodecamp.org/news/error-src-refspec-master-does-not-match-any-how-to-fix-in-git/)
  - [Fixing “origin does not appear to be a git repository”] [blog.devgenius](https://blog.devgenius.io/adding-git-remote-origin-39db848349c2)
  - [Using Personal Access Tokens for GitHub] [stackoverflow](https://stackoverflow.com/questions/18935539/authenticate-with-github-using-a-token)

Many of these links were used directly while building NovaNews; others are useful rabbit holes if you want to go deeper into design, architecture, or tooling.

***
