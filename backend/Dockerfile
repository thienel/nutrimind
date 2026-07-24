# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS builder
WORKDIR /app

# The cache mounts persist across builds, which the Docker layer cache alone
# cannot do: `go mod download` only fetches module *source*, so once `COPY . .`
# is invalidated by any code change the build recompiles all ~820 packages from
# scratch. Keeping GOCACHE and the module cache turns a rebuild into just the
# handful of packages that actually changed.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o bin/server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/bin/server .
EXPOSE 8000
CMD ["./server"]
