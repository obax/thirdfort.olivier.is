FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o server .

FROM gcr.io/distroless/static-debian12

COPY --from=builder /app/server /server

EXPOSE 3000

ENTRYPOINT ["/server"]
