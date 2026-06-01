.PHONY: build run dev test lint tidy clean

# Build variables
BINARY_NAME=server
BUILD_DIR=bin

# Go variables
GOCMD=go
GOBUILD=$(GOCMD) build
GORUN=$(GOCMD) run
GOTEST=$(GOCMD) test
GOMOD=$(GOCMD) mod

# Build the server
build:
	@echo "Building server..."
	@mkdir -p $(BUILD_DIR)
	@$(GOBUILD) -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/server
	@echo "✓ Server built: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the server
run: build
	@./$(BUILD_DIR)/$(BINARY_NAME)

# Run with hot reload (requires air: go install github.com/air-verse/air@latest)
dev:
	@air -c .air.toml || $(GORUN) ./cmd/server

# Run tests
test:
	@$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	@$(GOTEST) -v -coverprofile=coverage.out ./...
	@$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "✓ Coverage report: coverage.html"

# Run linter (requires golangci-lint)
lint:
	@golangci-lint run ./...

# Tidy dependencies
tidy:
	@$(GOMOD) tidy

# Clean build artifacts
clean:
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html
	@echo "✓ Cleaned"

# Generate swagger docs (requires swag)
swagger:
	@swag init -g cmd/server/main.go -o docs

# Show help
help:
	@echo "Available targets:"
	@echo "  build          - Build the server binary"
	@echo "  run            - Build and run the server"
	@echo "  dev            - Run with hot reload (requires air)"
	@echo "  test           - Run tests"
	@echo "  test-coverage  - Run tests with coverage report"
	@echo "  lint           - Run linter (requires golangci-lint)"
	@echo "  tidy           - Tidy dependencies"
	@echo "  clean          - Clean build artifacts"
	@echo "  swagger        - Generate swagger docs"
	@echo "  ent/gen        - Generate Ent code"
	@echo "  ent/new        - Create a new Ent schema (usage: make ent/new NAME=User)"
	@echo "  migrate/diff   - Create a migration file based on schema changes (usage: make migrate/diff NAME=add_users)"
	@echo "  migrate/apply  - Apply pending migrations to the database (usage: make migrate/apply DB_URL=...)"

# Generate Ent code
ent/gen:
	@go generate ./internal/ent

# Create a new Ent schema (usage: make ent/new NAME=User)
ent/new:
	@go run -mod=mod entgo.io/ent/cmd/ent new --target internal/ent/schema $(NAME)

# Create a new migration file based on Ent schema changes
migrate/diff:
	@atlas migrate diff $(NAME) \
	  --dir "file://internal/ent/migrate/migrations" \
	  --to "ent://internal/ent/schema" \
	  --dev-url "docker://postgres/15/test"

# Apply pending migrations to the database
DB_URL ?= "postgres://username:password@localhost:5432/go_backend_template?search_path=public&sslmode=disable"
migrate/apply:
	@atlas migrate apply \
	  --dir "file://internal/ent/migrate/migrations" \
	  --url $(DB_URL)
