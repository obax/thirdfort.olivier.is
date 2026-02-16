# Thirdfort Fullstack Engineering Assessment

A prototype document upload and verification system, built as a take-home exercise for [Thirdfort](https://thirdfort.com/).

**Live demo:** [thirdfort.olivier.is](https://thirdfort.olivier.is/)

## The brief

Build a proof of concept that lets a user upload identity documents (passport photo, mortgage offer letter, etc.) via a web portal so they no longer need to visit their solicitor's office in person.

**Requirements:**
1. Users should be able to upload a document as either a PDF or a standard image format.
2. The system should store the document and track its status.
3. Solicitors should be able to see a list of uploads and their status.

**Constraints:** Go and TypeScript only, any frameworks/libraries/database otherwise, AI tooling encouraged, mocking (e.g. local disk for file storage) is fine.

## Getting started

Prerequisites: [Docker](https://www.docker.com/) (with Compose v2) and [just](https://github.com/casey/just).

```
just up
```

This builds and starts three services:

| Service  | URL                    | Description              |
|----------|------------------------|--------------------------|
| client   | http://localhost:5173  | Vite/React frontend      |
| server   | http://localhost:3000  | Go HTTP backend          |
| db       | localhost:5432         | PostgreSQL 17            |

The **Upload** tab lets a user select and upload a PDF, JPEG, or PNG. The **Documents** tab shows all uploads and lets a solicitor verify or reject each one.

Other useful commands:

| Command     | Description                  |
|-------------|------------------------------|
| `just up`   | Build and start all services |
| `just down` | Stop all services            |
| `just logs` | Tail logs from all services  |
| `just lint` | Run ESLint on the frontend   |
| `just db`   | Open a psql shell            |

## Architecture and design decisions

The system is split into three services orchestrated by Docker Compose:

**Backend (Go/Gin)** exposes three endpoints:

- `POST /documents` -- Receives a multipart file upload. The handler sniffs the first 512 bytes to detect the real content type (rather than trusting the `Content-Type` header), rejects anything that is not PDF, JPEG, or PNG, writes the file to disk under a UUID-based name, and inserts a metadata row into Postgres. If the database insert fails, the file is cleaned up from disk.
- `GET /documents` -- Returns all documents ordered by upload time descending.
- `PATCH /documents/:id` -- Accepts a JSON body with a `status` field (`verified` or `rejected`). Only forward transitions from `pending` are permitted.

**Frontend (React/Vite)** is a single-page app with two tabs. The upload form uses `XMLHttpRequest` instead of `fetch` so it can report real upload progress via the `progress` event. The documents tab polls on mount and optimistically updates the local list after a successful PATCH.

**Database (PostgreSQL)** uses a single `documents` table with a Postgres enum for the status column, which enforces valid states at the database level.

Files are stored on a shared Docker volume (`./uploads`) mounted into the Go container. This is a deliberate simplification; in production this would be an object store (S3, GCS).

## Tech choices

- **PostgreSQL 17** -- Pinned explicitly rather than using `postgres:latest`. The v18+ Docker images introduced a breaking change to the data directory layout (`/var/lib/postgresql/data` is no longer used directly), which causes volume mount failures on existing setups. Pinning to 17 avoids this while still using a current, supported release.
- **Go 1.24 + Gin** -- The server Dockerfile uses a multi-stage build: compile in `golang:1.24`, copy the binary into `gcr.io/distroless/static-debian12`. Gin replaced raw `net/http` early on because it provides method-based routing (automatic 405 responses), consistent JSON error formatting, and built-in logger/recovery middleware for minimal boilerplate.
- **Node 24 (slim)** -- Runs the Vite dev server directly, suitable for this prototype stage.
- **React 19 + Tailwind CSS v4** -- Tailwind v4 uses CSS-native `@theme` blocks instead of a JavaScript config file, which keeps the design token surface area in one place (`index.css`).

## Assumptions and trade-offs

- **No authentication.** The brief does not mention auth, so both the upload and admin views are open. In a real system the solicitor view would sit behind an auth gate and the upload link would be a tokenised, time-limited URL sent to the client.
- **No file size limit enforced in code.** Gin's default request body limit applies. A production system would enforce a maximum size (say 10 MB) and return a 413.
- **Single-table design.** There is no `users` or `cases` table. Documents are standalone. A next step would be to associate each document with a case and a requesting solicitor.
- **Content-type sniffing over header trust.** The upload handler reads the first 512 bytes and uses `http.DetectContentType` rather than relying on the client-provided MIME type. This prevents a user renaming a `.exe` to `.pdf` and bypassing validation.
- **No virus/malware scanning.** Uploaded files are stored as-is. A production pipeline would pass them through a scanning service before marking them as safe.
- **Local disk storage.** Files land in `./uploads` on the host. This is fine for a prototype but would not survive container restarts without the volume mount, and does not scale horizontally.
- **Optimistic UI updates.** After a successful PATCH the frontend splices the updated document into the local list rather than re-fetching. This keeps the UI snappy but means a concurrent update from another solicitor would not be visible until the next page load.

## How I used AI tooling

I split the work into two categories: commodity tasks and judgement calls. Commodity tasks (scaffolding, config, branding, documentation lookups) were delegated to LLM agents. Judgement calls (API design, error handling semantics, data modelling, trade-off decisions) stayed with me.

**What I delegated to agents:**
- **Brand extraction.** An agent navigated thirdfort.com via Puppeteer, extracted computed styles (hex colours, font families, border radii, shadows), and produced Tailwind v4 `@theme` tokens. Applying those tokens to the React components was also agent work.
- **Scaffolding.** Dockerfiles, `docker-compose.yml`, the justfile, Dependabot config, and project wiring were all generated and verified by agents.
- **Backlog management.** Task breakdown and tracking ran through [Beads](https://github.com/steveyegge/beads), an in-repo issue tracker designed for AI-assisted workflows.
- Documentation lookups via Context7 for tools I hadn't used before, like [mise](https://mise.jdx.dev/).

**What I did myself:**
- API contract design (which endpoints, which HTTP methods, what the request/response shapes look like).
- The upload handler's content-type sniffing logic and its cleanup-on-failure behaviour.
- Deciding on a Postgres enum for document status rather than a plain string column.
- The frontend's data flow: `XMLHttpRequest` for upload progress, optimistic updates after PATCH.

The split is deliberate. Scaffolding, config, and branding are commodity tasks where correctness is binary and easily verified. Design decisions and error semantics are where human judgement earns its keep.

## Deployment

- **Frontend:** [Vercel](https://vercel.com/) at [thirdfort.olivier.is](https://thirdfort.olivier.is/)
- **Backend:** [Fly.io](https://fly.io/) via GitHub Actions (multi-stage Docker build into a distroless runtime image)

## Areas for improvement

- **Authentication and authorisation** -- JWT or session-based auth for the solicitor view; tokenised upload links for clients.
- **Object storage** -- Replace local disk with S3/GCS and generate pre-signed URLs for uploads, removing the backend as a proxy for large files.
- **Pagination** -- The list endpoint returns everything. Add cursor-based pagination before the document count grows.
- **Audit trail** -- Log status transitions with timestamps and the acting user, rather than overwriting `updated_at`.
- **File previews** -- Generate thumbnails for images and render PDF pages in the browser so solicitors can review without downloading.
- **Tests** -- Add Go handler tests (using `httptest`) and React component tests (using Vitest + Testing Library).
- **CORS** -- Currently handled by the Vite dev proxy. In production the Go server would need explicit CORS middleware (`gin-contrib/cors`).
- **CI/CD** -- Add a GitHub Actions workflow to lint, test, and build Docker images on push.
- **Database migrations** -- Replace the init script with a migration pipeline (e.g. [golang-migrate](https://github.com/golang-migrate/migrate) or [Atlas](https://atlasgo.io/)) so schema changes can be versioned, reviewed in PRs, and rolled back safely.
