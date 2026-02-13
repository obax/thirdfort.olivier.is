# List available recipes
default:
    @just --list

# Build and start all services
up:
    docker compose up --build

# Stop all services
down:
    docker compose down

# Tail logs from all services
logs:
    docker compose logs -f

# Run ESLint on the frontend
lint:
    cd client && npm run lint

# Open a psql shell
db:
    docker compose exec db psql -U thirdfort -d thirdfort

# Run all tests
test: test-server test-client

# Run Go server tests
test-server:
    cd server && go test -v ./...

# Run React client tests
test-client:
    cd client && npm test
