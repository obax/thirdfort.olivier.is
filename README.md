# Thirdfort Fullstack Engineering Assessment

We _really_ appreciate you taking the time to apply for a role in Thirdfort's software engineering team, alongside the time that you've committed to the process so far. So that we can get a feel for your product thinking and technical problem-solving skills, we'd like you to complete a small technical exercise.

# Pre-requisites

Before you begin, you should ensure that you have the following installed:
- Recent runtimes for [TypeScript](https://www.typescriptlang.org/) and [Golang](https://go.dev/), although we recommend you install and manage these using a version manager such as [Mise](https://mise.jdx.dev/).
- A recent version of [Docker](https://www.docker.com/).
- A few un-interupted hours to work on the task.
- A strong cup of coffee, or tea if you prefer.

# The Task

**Goal:** Build a prototype system for uploading and verifying user documents.

**Time Limit:** 3 Hours. Please do not spend more than time than this! We prioritize a working MVP and a good README over feature completeness.

It's quite typical that a solicitor will require a client to provide them with some identity documentation, such as a photo of their passport or driver's license. Or, during a house purchase, a solicitor may require a client to provide them with a copy of their mortgage offer letter. At present, this process is cumbersome requiring the client to visit the solicitor's office and present the requested documents so that they can be validated and copies can be taken and stored digitaly into the solicitor's case management system.

We've been asked to build a new proof of convept that would allow a user to upload documentation via a web portal instead, removing the need for them to visit the solicitor's office.

**Requirements:**
1. Users should be able to upload a document as either a PDF or a standard image format.
2. The system should store the document and track its status.
3. Solicitors should be able to see a list of uploads and their status.

**Product & Technical Requirements:**
- Frontend: Provide a simple interface that allows a user to select and upload a document, e.g a photo of their passport.
- Backend: Create an API to receive the file, validate it, and facilitate storage.
- Data Persistence: The system must track the status of the document (e.g., Pending, Verified, Rejected) and associated metadata.
- Administration: Provide a way for an solicitor to view a list of uploaded documents and their current status.

**Constraints:**
- Please stick to the languages that we use here at Thirdfort, specifically [Golang](https://go.dev/) and [TypeScript](https://www.typescriptlang.org/). We've provided a basic scaffold in this repository to helpget you started.
- Other than the above please feel free to use any frameworks, libraries or database that you are comfortable with but do be prepared to justify your choices.
- Feel free to use any AI tooling to aid you in the task.
- Feel free to mock where you need to, for example mocking file storage using the local disk is absolutely fine.

**We are assessing for:**
- Product Mindset: How well you've understood the problem and task.
- Ambiguity: How you make judgement calls and navigate ambiguous requirements.
- Architecture: Does your solution provide a stable foundation that could be further built upon.
- Structure: How you organize your code and separation of concerns.
- Reliability: How you handle errors and edge cases.
- Delivery: It doen't matter if it isn't complete, but it *must* be functioning.
- Communication: Your README is as important as your code, so please document any assumptions, trade-offs, etc.

**Submission:**
1. Document your submission in [README.md](./docs/README.md).
2. Push your work to a new remote branch, and raise a PR.
3. Request a review from the repositor owner.

# Scaffold

To help you get started, we've provided a basic scaffold that consists of the following:
- Frontend: [A templated TypeScript/React project created using Vite](./client/README.md).
- Backend: [A minimal Go HTTP server](./server/README.md).
- Database: [A Postgres database container](./db/README.md).

# FAQ

And finally, here are some frequently asked questions that you may find useful:
- The task is intentionally open-ended, and there are multiple valid approaches to solving the problem.
- If a requirement is ambiguous, make a reasonable assumption, document it in your README, and proceed. Do not block on ambiguity.
- We're not after a perfect nor complete solution, but we do want your solution to demonstrate how capable you are at 
understanding the problem behind the ask, alongside how you apply that understanding to engineer a solution.
- We value architectural decisions and code quality over feature completeness. If you run out of time, document what
  you would have done.

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

### What needs doing

- **Create the TypeScript frontend** for interacting with the API
- **Add list and status-update endpoints** to the Go backend
- **Write the Dockerfiles** for both services so they can be built and deployed
- **Complete `docker-compose.yml`** with build contexts, port mappings, and any shared networking

### Deployment

The Go backend is deployable via Docker:

```
docker compose up --build
```

The Go backend uses a multi-stage build (compile in a builder image, copy the binary into a minimal runtime image). Postgres is pinned to version 17 to avoid breaking changes in the v18+ Docker image data directory layout. The `docker-compose.yml` defines all three services with build contexts, port mappings, and health checks.

The frontend will be deployed on Vercel, inspired by Thirdfort's portal (`portal.thirdfort.com`, discovered via [certificate transparency logs](https://crt.sh/?q=thirdfort.com)).