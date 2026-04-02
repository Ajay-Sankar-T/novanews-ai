***

# `app/library/` · My Library Route (NovaNews)

This folder defines the **authenticated saved‑articles experience** in NovaNews. It contains a single route segment:

```text
app/library/
└── page.tsx
```

The `/library` route is the **“My Library” / “Saved”** section required by the AI & Software Guild brief, where authenticated users can view and manage bookmarked news and their associated AI summaries.

It sits on top of:

- Clerk authentication (for user identity). [clerk](https://clerk.com/nextjs-authentication)
- Prisma + PostgreSQL (for persistence). [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)
- Next.js App Router (for routing and rendering). [clerk](https://clerk.com/docs/nextjs/getting-started/quickstart)

***

## 1. High‑Level Responsibilities

`app/library/page.tsx` is a **client component** that:

1. Reads authentication state via `useAuth()` from `@clerk/nextjs`. [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)
2. Calls the backend `GET /api/save` endpoint to fetch all saved articles for the current user. [clerk](https://clerk.com/docs/nextjs/guides/users/reading)
3. Renders a responsive grid of cards, each representing a `SavedArticle` record from the database.
4. Supports “Unsave” actions via `DELETE /api/save`.
5. Handles UI states:
   - Loading
   - Not signed in
   - Empty library
   - Populated library

This route is also **server‑protected** by `middleware.ts` using `clerkMiddleware` and `auth.protect()`, so unauthenticated users are redirected at the edge before this component even renders. [clerk](https://clerk.com/docs/reference/nextjs/clerk-middleware)

***

## 2. Component Interface & Types

### 2.1 `SavedArticle` Type

Locally, the page defines a TypeScript type that mirrors the Prisma `SavedArticle` model:

```ts
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
```

This is designed to match:

- The shape returned by `/api/save` (serialized JSON of Prisma rows).
- The display needs of the library UI (title, description, metadata, AI summary).

Under the hood, the actual Prisma model is defined in `prisma/schema.prisma`, but this type provides a **UI‑friendly view** of that data. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

***

## 3. State & Auth Flow

`page.tsx` is marked `"use client";` because it relies on hooks and browser‑side fetch.

### 3.1 Local State

The page manages three main state variables:

```ts
const [articles, setArticles] = useState<SavedArticle[]>([]);
const [loading, setLoading] = useState(true);
const [removing, setRemoving] = useState<string | null>(null);
```

- `articles`: current list of saved articles for the signed‑in user.
- `loading`: whether the initial fetch to `/api/save` is in progress.
- `removing`: URL of the article currently being unsaved (used to disable the corresponding button and show “Removing...” feedback).

### 3.2 Auth State

The page imports `useAuth` from Clerk:

```ts
import { useAuth, SignInButton } from "@clerk/nextjs";

const { isLoaded, isSignedIn } = useAuth();
```

- `isLoaded`: ensures that we don’t make decisions before the auth state is fully hydrated.
- `isSignedIn`: determines whether to show the library, a sign‑in prompt, or a loading state.

This pattern follows Clerk’s recommended App Router hook usage for client components. [clerk](https://clerk.com/docs/nextjs/reference/hooks/use-session)

***

## 4. Data Fetching Logic

The core side effect is a `useEffect` that runs when `isLoaded` or `isSignedIn` changes:

```ts
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

Behavior:

- While auth state is still loading (`!isLoaded`), no fetch is attempted.
- If the user is not signed in, the component:
  - Clears `articles`.
  - Marks `loading` as false, so it can render the sign‑in prompt.
- If the user is signed in:
  - Calls `GET /api/save`, which:
    - Uses `auth()` on the server to determine `userId`. [clerk](https://clerk.com/docs/reference/nextjs/app-router/auth)
    - Queries Prisma for `SavedArticle` rows where `userId` matches.
  - Stores the result in `articles`.

Edge note: `/api/save` is also protected by Clerk middleware, so it can never be called anonymously at the server; this hook is simply the client‑side entrypoint to that behavior. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

***

## 5. Unsave Workflow

The **Unsave** button calls `handleUnsave(url)`:

```ts
async function handleUnsave(url: string) {
  setRemoving(url);

  try {
    const res = await fetch("/api/save", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) throw new Error("Failed to unsave");

    setArticles((prev) => prev.filter((article) => article.url !== url));
  } catch {
    // optional: toast / error UI
  } finally {
    setRemoving(null);
  }
}
```

Key points:

- It updates `removing` so the UI can disable that specific button and show `"Removing..."`.
- It calls `DELETE /api/save` with the `url`, which:
  - Uses `auth()` to determine `userId`.
  - Deletes the record matching both `userId` and `url` in the database. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)
- On success, it *optimistically updates* local state by filtering out the removed article, avoiding a full refetch.

This aligns with typical patterns in full‑stack Prisma + Next.js apps where route handlers act as resource controllers. [dev](https://dev.to/alexisintech/create-a-nextjs-app-with-clerk-prisma-trpc-tanstack-query-zod-tailwind-ipi)

***

## 6. UI States & Layout

### 6.1 Header

The header mirrors the NovaNews brand from the home feed but adapts copy to the library context:

- Left side:
  - Eyebrow: `"Saved articles"`.
  - Title: `"My Library"`.
- Right side:
  - Link back to `/` (`← Back to feed`), using `next/link` for client‑side navigation.

This preserves identity and navigation consistency between the feed and library.

### 6.2 Main Body: State‑Driven Rendering

Inside the `<section>` there is a compact state machine rendered in JSX:

1. **Auth not loaded (`!isLoaded`)**:
   - Simple text: `"Loading…"`.

2. **User not signed in (`!isSignedIn`)**:
   - Card explaining that library is linked to a NovaNews account.
   - `SignInButton` (Clerk) opens a modal for auth. [clerk](https://clerk.com/nextjs-authentication)

3. **Signed in & loading (`loading`)**:
   - Text: `"Loading saved articles…"`, or you can extend this to a skeleton grid similar to the home feed.

4. **Signed in & `articles.length === 0`**:
   - Empty state card:
     - Title: `"No saved articles yet"`.
     - Copy: encourages saving from the main feed.

5. **Signed in & `articles.length > 0`**:
   - A responsive grid of cards displaying each saved article.

This branching ensures users always see a meaningful and context‑appropriate UI, a practice emphasized in multiple UX articles on empty, loading, and error states. [uxdesign](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc)

### 6.3 Card Layout for Saved Articles

Each `SavedArticle` is rendered as:

- **Image header**
  - If `imageUrl` exists:
    - `<img>` with `h-52`, full width, `object-cover`.
  - Else:
    - Placeholder div: `"No image"`.

- **Metadata row (source + saved date)**
  - Source: `article.source || "Unknown source"`.
  - Date: `new Date(article.createdAt).toLocaleDateString()`.

- **Title**
  - Prominent `text-xl` heading.

- **Description**
  - Short snippet or fallback text.

- **AI Summary block**
  - If `aiSummary` is present:
    - Rendered inside a rounded, lightly tinted box under the description.

- **Actions row**
  - Left:
    - `"Read full article"` link, opening the original URL in a new tab.
  - Right:
    - `"Unsave"` button, wired to `handleUnsave(article.url)`, with disabled state when `removing === article.url`.

The card structure intentionally mirrors the home feed, reinforcing familiarity and mental model: a user should immediately recognize that these are the same articles they previously saved, now with persisted AI context.

Card‑based library design is consistent with best practices for saved items and favorites lists in dashboards and content apps. [mockplus](https://www.mockplus.com/blog/post/card-ui-design)

***

## 7. Relationship to Other Modules

Although this readme lives inside `app/library/`, this page interacts heavily with:

- **`app/api/save/route.ts`**
  - `GET` → populates `articles`.
  - `DELETE` → unsaves a record.
  - All queries are scoped by `userId` obtained via `auth()`, ensuring per‑user privacy. [clerk](https://clerk.com/docs/nextjs/guides/users/reading)

- **`middleware.ts` (project root)**
  - Uses `clerkMiddleware` and `createRouteMatcher` to call `auth.protect()` on `/library(.*)` and `/api/save(.*)`. [stackoverflow](https://stackoverflow.com/questions/78134090/clerk-and-next-js-authentication-middleware-code-isnt-protecting-my-route-dash)
  - Ensures unauthenticated access never sees this route or its API.

- **`prisma/schema.prisma`**
  - Defines `SavedArticle` (fields like `userId`, `title`, `url`, `aiSummary`, `createdAt`).
  - Changes here require updating `SavedArticle` type and corresponding rendering, making project documentation at both levels crucial. [neon](https://neon.com/docs/get-started/signing-up)

- **Neon Console**
  - When debugging library issues, the tables and SQL editor views in Neon are where you can inspect `SavedArticle` rows directly (check `userId`, `url`, `createdAt`). [neon](https://neon.com)

***

## 8. Typical Modifications & Where to Make Them

Scenarios you might encounter and what to touch:

- **Change what is displayed for each saved article:**
  - Modify the JSX in `page.tsx` inside the map over `articles`.
  - Optionally adjust the `SavedArticle` type to add new fields (e.g., tags).

- **Add sorting (e.g., by date or category):**
  - Apply array sorting to `articles` in `page.tsx` before rendering.
  - Or modify the `GET /api/save` query in `api/save/route.ts` with `orderBy`.

- **Add filtering (e.g., only “Technology” saves):**
  - Introduce filter UI here or share category filters with the home page.
  - Filter `articles` client‑side or send category criteria to `GET /api/save`.

- **Alter how unsave works (e.g., confirmation modal):**
  - Wrap `handleUnsave` calls with a confirmation dialog or custom toast.

- **Integrate more AI behavior (e.g., “Re‑summarize” with updated model):**
  - Add another button that calls `/api/summary` with stored content and updates `aiSummary` via `POST /api/save`.

***

## 9. Conceptual Positioning

From an architecture perspective, `app/library/` represents:

- The **read‑heavy**, user‑specific view of persisted data.
- The **mirror** of `app/page.tsx`:
  - Home → ephemeral consumption.
  - Library → durable, curated collection.

It fulfills the guild’s requirement for a **“My Library / Saved”** section and demonstrates:

- Multi‑user isolation via Clerk + Prisma.
- Real SQL integration via Neon.
- A production‑style interaction design for saved content.

This route is where NovaNews shifts from “just a news reader” to a **personal knowledge base** anchored in authenticated, persistent data.
