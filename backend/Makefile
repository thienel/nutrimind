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
	@swag init -g cmd/server/main.go --outputTypes go,json,yaml -o ../docs/swagger

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
