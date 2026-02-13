# Go HTTP Server

This directory contains a minimal Go HTTP server for the Thirdfort assessment.

To run the server, execute the following command from the root of the repository:

```bash
go run ./server/main.go
```

You can then verify the server is running using `curl http://localhost:3000`.

## Deploying to Fly.io

Prerequisites: the [flyctl](https://fly.io/docs/flyctl/install/) CLI, authenticated via `fly auth login`.

```bash
cd server
fly launch          # first time only -- provisions the app, Postgres, and a volume
fly deploy          # subsequent deploys
```

`fly.toml` is configured for the `lhr` (London) region with a persistent volume mounted at `/app/uploads` for file storage. The `DATABASE_URL` secret must be set to point at a Fly Postgres instance:

```bash
fly secrets set DATABASE_URL="postgres://..."
```