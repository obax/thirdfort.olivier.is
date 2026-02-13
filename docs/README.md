# Submission

## Getting started

Prerequisites: [Docker](https://www.docker.com/) (with Compose v2).

```
docker compose up --build
```

This starts three services:

| Service  | URL                    | Description              |
|----------|------------------------|--------------------------|
| client   | http://localhost:5173  | Vite/React frontend      |
| server   | http://localhost:3000  | Go HTTP backend          |
| db       | localhost:5432         | PostgreSQL 17            |

## Tech choices

- **PostgreSQL 17** -- Pinned explicitly rather than using `postgres:latest`. The v18+ Docker images introduced a breaking change to the data directory layout (`/var/lib/postgresql/data` is no longer used directly), which causes volume mount failures on existing setups. Pinning to 17 avoids this while still using a current, supported release.
- **Go 1.24** -- Latest stable release available as a Docker image. The server Dockerfile uses a multi-stage build with a distroless runtime image to keep the final image minimal.
- **Node 24 (slim)** -- Runs the Vite dev server directly, suitable for this prototype stage.

## Architecture and design decisions

TODO

## Assumptions and trade-offs

TODO

## Areas for improvement

TODO
