# Thirdfort Fullstack Engineering Assessment

A prototype document upload and verification system, built as a take-home exercise for [Thirdfort](https://thirdfort.com/). The full submission write-up (assumptions, trade-offs, areas for improvement) lives in [`docs/README.md`](./docs/README.md).

## The brief

Build a proof of concept that lets a user upload identity documents (passport photo, mortgage offer letter, etc.) via a web portal so they no longer need to visit their solicitor's office in person.

**Requirements:**
1. Users should be able to upload a document as either a PDF or a standard image format.
2. The system should store the document and track its status.
3. Solicitors should be able to see a list of uploads and their status.

**Constraints:** Go and TypeScript only, any frameworks/libraries/database otherwise, AI tooling encouraged, mocking (e.g. local disk for file storage) is fine.

## Thoughts

### Current state

The repo contains scaffolding for a two-service architecture: a Go backend and a TypeScript frontend, wired together via Docker Compose. Both services have host environment variables configured (`thirdfort.olivier.is` and `fe-thirdfort.olivier.is`), suggesting reverse-proxy or DNS-based routing in production.

A `DocumentStatus` enum is defined in `src/status.go` with three states: `Pending`, `Verified`, and `Rejected`. This points towards a document verification workflow, which aligns with Thirdfort's identity verification domain.

### How I worked

I treated the LLM as a junior engineer I could delegate commodity work to, so I could spend my limited time on the decisions that actually matter: API design, data modelling, error handling semantics, and product thinking.

**What I delegated to agents:**
- Backlog creation and task breakdown (via [Beads](https://github.com/steveyegge/beads), an in-repo issue tracker designed for AI workflows).
- Scaffolding and configuration: Dockerfiles, `docker-compose.yml`, build configs, Dependabot, the justfile.
- Visual brand extraction: an agent used Puppeteer to scrape thirdfort.com, extract computed styles (colours, fonts, radii, shadows), and produce Tailwind v4 theme tokens. Applying those tokens to the UI was also agent work.
- Documentation lookups via Context7 for tools I hadn't used before, like [mise](https://mise.jdx.dev/).

**What I did myself:**
- API contract design (which endpoints, which HTTP methods, what the request/response shapes look like).
- The upload handler's content-type sniffing logic and its cleanup-on-failure behaviour.
- Deciding on a Postgres enum for document status rather than a plain string column.
- The frontend's data flow: `XMLHttpRequest` for upload progress, optimistic updates after PATCH.
- All architectural trade-off decisions documented in `docs/README.md`.

The split is deliberate. Scaffolding, config, and branding are commodity tasks where correctness is binary and easily verified. Design decisions and error semantics are where human judgement earns its keep.

### Why Gin over net/http

The initial upload endpoint was built with `net/http`, which meant manual method checks, hand-rolled JSON error responses, and no middleware pipeline. Switching to [Gin](https://gin-gonic.com/) while there was only one handler to migrate kept the churn minimal and gives us method-based routing (GET on a POST-only route returns 405 automatically), consistent JSON error formatting via `gin.H`, and built-in logger/recovery middleware. Adding CORS for the React frontend later is a one-liner with `gin-contrib/cors`.

### Deployment

The Go backend is deployable via Docker:

```
docker compose up --build
```

The Go backend uses a multi-stage build (compile in a builder image, copy the binary into a minimal runtime image). Postgres is pinned to version 17 to avoid breaking changes in the v18+ Docker image data directory layout. The `docker-compose.yml` defines all three services with build contexts, port mappings, and health checks.

The frontend will be deployed on Vercel, inspired by Thirdfort's portal (`portal.thirdfort.com`, discovered via [certificate transparency logs](https://crt.sh/?q=thirdfort.com)).
