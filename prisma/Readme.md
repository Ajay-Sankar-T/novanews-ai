
***

# `prisma/` Directory · NovaNews Data Layer

The `prisma/` directory defines and manages the **relational data model** for NovaNews. It is the single source of truth for how data is stored in PostgreSQL (hosted on Neon) and how the application accesses that data via the Prisma Client. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

Conceptually, this folder is:

- The **schema contract** between the application and the database.
- The **migration log** for evolving the schema over time.
- The **entry point** for Prisma tooling (`migrate`, `studio`, `generate`).

Everything else in the app that touches persistent data (e.g., `app/api/save/route.ts`) is built on top of what is defined here. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

***

## 1. Contents

```text
prisma/
├── schema.prisma           # Prisma data model and datasource/client config
└── migrations/
    └── 0_init/
        └── migration.sql   # Initial SQL migration created by Prisma
```

Additional migration directories will appear over time as the schema evolves (e.g., `202604021200_add_index`), each with its own `migration.sql` file.

***

## 2. `schema.prisma` – Data Model & Configuration

`schema.prisma` is the **Prisma schema file**. It describes:

- Which database Prisma talks to (datasource).
- How Prisma Client should be generated (generator).
- What models (tables) exist in the database and how they relate. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

### 2.1 Datasource & Generator

You will see sections similar to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

Explanation:

- `datasource db`:
  - `provider = "postgresql"` – matches the guild requirement of using PostgreSQL. [learn.microsoft](https://learn.microsoft.com/en-us/azure/partner-solutions/neon/overview)
  - `url = env("DATABASE_URL")` – the connection string is injected from environment variables:
    - Locally: `.env` / `.env.local`
    - Production: Vercel project settings
  - In NovaNews, `DATABASE_URL` usually points to a **Neon** serverless Postgres instance. [neon](https://neon.com)

- `generator client`:
  - Tells Prisma to generate a JavaScript/TypeScript client for the defined models.
  - The generated client is imported in route handlers (e.g., `app/api/save/route.ts`) to run typed queries.

This structure follows Prisma’s recommended configuration for a Node/Next.js stack. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

***

### 2.2 Models

NovaNews’s data needs are modest but opinionated: the key concept is a **saved article per user**. That is represented by the `SavedArticle` model.

A typical `SavedArticle` model:

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

#### 2.2.1 Field-by-field rationale

- `id Int @id @default(autoincrement())`
  - Primary key for each row; simple integer auto‑increment.
- `userId String`
  - Foreign key (logically) to the Clerk user, but stored just as a string.
  - Used by API routes to ensure each user only sees their own records. [clerk](https://clerk.com/docs/nextjs/guides/users/reading)
- `title String`
  - Article headline at the time of saving.
- `description String?`
  - Short description/summary provided by the News API; marked optional because some articles might not include it.
- `source String?`
  - Name of the news source (e.g., “Reuters”, “BBC”); optional for robustness.
- `url String`
  - Canonical URL to the article; shared between frontend, backend, and database.
- `imageUrl String?`
  - URL of the article’s thumbnail at the time of saving; optional because not all articles have images.
- `category String?`
  - Category the user was viewing when they saved the article (e.g., `"technology"` or `"search"`).
- `aiSummary String?`
  - The AI‑generated two‑sentence summary, if already computed when the user saved the article.
  - Allows NovaNews to display stored summaries in My Library without re‑calling the LLM, saving cost and time. [ably](https://ably.com/blog/how-to-use-clerk-to-authenticate-next-js-route-handlers)
- `createdAt DateTime @default(now())`
  - Timestamp of when the article was saved.

#### 2.2.2 Indexes and constraints

- `@@index([userId])`
  - Speeds up queries that fetch articles for a specific user:  
    `SELECT ... FROM SavedArticle WHERE userId = 'user_...'`.
  - This pattern comes straight from Prisma recommendations for multi‑tenant patterns and is standard for per‑user data. [dev](https://dev.to/alexisintech/create-a-nextjs-app-with-clerk-prisma-trpc-tanstack-query-zod-tailwind-ipi)

- `@@unique([userId, url])`
  - Ensures a user cannot save the same URL multiple times (idempotent saves).
  - Simplifies logic: the frontend can treat “saved” as a binary state, and the backend does not end up with duplicates.

Meta-note: Future features (e.g., topics, AI tags, reading history) could extend this model or introduce new models; `schema.prisma` is the correct place to declare them.

***

## 3. `migrations/` – Schema Evolution Log

The `migrations/` directory stores all database migrations created by Prisma’s migration engine.

Example:

```text
prisma/
└── migrations/
    └── 0_init/
        └── migration.sql
```

### 3.1 `0_init/migration.sql`

This is the **initial migration** that creates the `SavedArticle` table and any indices/constraints defined in `schema.prisma`.

The SQL will typically:

- Create the `SavedArticle` table.
- Add the primary key constraint on `id`.
- Add the unique constraint on `(userId, url)`.
- Add the index on `userId`.

Prisma generates this SQL from the model definitions when you run `npx prisma migrate dev`. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

### 3.2 Additional migrations (future)

If you later:

- Add a new field (e.g., `tags String[]`).
- Introduce a new model (e.g., `UserPreferences`).
- Change indexes or constraints.

You will create a new migration:

```bash
npx prisma migrate dev --name add_user_preferences
```

This produces a new folder under `migrations/` with a timestamped name and a `migration.sql` reflecting your changes.

The migrations folder therefore becomes a **time‑ordered journal of schema changes**, crucial for reproducible deployments, rollbacks, and collaboration. [traversymedia](https://www.traversymedia.com/blog/build-an-expense-tracker-nextjs-prisma-neon-clerk)

***

## 4. Relationship Between Prisma, Neon, and the App

### 4.1 Neon as the physical database

- Neon hosts the actual PostgreSQL instance.
- `DATABASE_URL` in `.env` or Vercel’s environment settings points to the Neon connection string retrieved from the Neon console’s **Connect** dialog. [neon](https://neon.com/docs/get-started/signing-up)
- When you apply migrations, Prisma writes to Neon, creating or altering tables accordingly.

Neon’s **console** and **tables/SQL editor** are used to visually inspect data created by NovaNews. [neon](https://neon.com/docs/guides/tables)

### 4.2 Prisma Client usage in the app

In code (outside this folder), route handlers import the Prisma client:

```ts
// For example, in app/api/save/route.ts
import { prisma } from "@/lib/prisma"; // or similar path

const { userId } = auth();

const articles = await prisma.savedArticle.findMany({
  where: { userId },
});
```

The Prisma client:

- Reads the types from `schema.prisma`.
- Compiles them into TypeScript definitions.
- Exposes methods (`findMany`, `create`, `delete`) on the generated model namespace.

This is how `app/api/save/route.ts` can safely query and mutate `SavedArticle` rows while getting full type inference in TypeScript. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)

***

## 5. Typical Commands for Working with `prisma/`

These commands use the configuration in `schema.prisma` and the migrations under `prisma/migrations/`.

### 5.1 Local development

```bash
# Generate Prisma Client (usually done automatically on install)
npx prisma generate

# Create & apply migrations based on schema changes
npx prisma migrate dev --name init

# Inspect data in a local or Neon DB with a GUI
npx prisma studio
```

- `prisma migrate dev` compares `schema.prisma` to the current DB state and generates new SQL migrations. [prisma](https://www.prisma.io/docs/guides/authentication/clerk/nextjs)
- `prisma studio` is useful for quick inspection, though the Neon console provides a cloud GUI alternative. [neon](https://neon.com/docs/get-started/signing-up)

### 5.2 Production / Vercel

When deploying NovaNews to Vercel:

1. Ensure `DATABASE_URL` in Vercel is set to the Neon connection string.
2. Run:

   ```bash
   npx prisma migrate deploy
   ```

   against the production DB (either as a post‑deploy step or from a local machine with `DATABASE_URL` pointing to prod).

This applies all migrations under `prisma/migrations/` in order, ensuring the production schema matches what the application expects. [neon](https://neon.com/docs/get-started/signing-up)

***

## 6. Design Principles Behind the Prisma Layer

The Prisma schema and migrations were designed based on a few guiding principles:

1. **Minimal but expressive model**

   - Use a single `SavedArticle` model to focus on the core feature: saving and revisiting news.
   - Avoid over‑modeling at the recruitment challenge stage.

2. **Per‑user isolation**

   - All queries are scoped by `userId`, matching Clerk’s session ID. [clerk](https://clerk.com/docs/reference/nextjs/app-router/auth)
   - Constraints and indexes (`@@unique([userId, url])`, `@@index([userId])`) enforce and optimize this pattern.

3. **Forward‑compatible**

   - Optional fields (`description?`, `imageUrl?`, `category?`, `aiSummary?`) allow the system to handle incomplete external data and evolve without immediate schema changes.
   - `createdAt` is always recorded, enabling future features like sorting and analytics.

4. **Consistency with full‑stack patterns**

   - The approach closely follows Prisma’s documentation and real full‑stack examples combining Next.js, Clerk, and Prisma. [dev](https://dev.to/alexisintech/create-a-nextjs-app-with-clerk-prisma-trpc-tanstack-query-zod-tailwind-ipi)

***

## 7. When to Modify `prisma/` vs Other Folders

Change `prisma/` when:

- You need a **new table** (model) or want to change an existing one.
- You want to add/remove fields or constraints to `SavedArticle`.
- You’re restructuring how data is stored (e.g., splitting `SavedArticle` into multiple models).

Change route handlers (e.g., `app/api/save/route.ts`) when:

- You’re altering how the app uses existing fields.
- You’re changing controller/business logic without altering the schema.

Always:

1. Update `schema.prisma`.
2. Run `npx prisma migrate dev --name <change-name>` locally.
3. Apply `npx prisma migrate deploy` to production Neon when deploying.

***

This `README` should give anyone inspecting `prisma/` a clear understanding of how NovaNews models its data, how the schema is evolved and applied, and how this folder fits into the broader architecture (Next.js App Router, Clerk auth, Neon hosting).
