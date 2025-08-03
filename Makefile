.PHONY: help build run dev stop clean logs shell test

# Default target
help:
	@echo "Git Quest - Docker Commands"
	@echo "=========================="
	@echo "build     - Build the production Docker image"
	@echo "run       - Run the production container"
	@echo "dev       - Run development server with hot reload"
	@echo "stop      - Stop all containers"
	@echo "clean     - Remove containers and images"
	@echo "logs      - Show container logs"
	@echo "shell     - Access container shell"
	@echo "test      - Run tests in container"

# Build production image
build:
	docker-compose build

# Run production container
run:
	docker-compose up -d
	@echo "Git Quest is running at http://localhost"

# Run development server
dev:
	docker-compose -f docker-compose.dev.yml up
	@echo "Development server starting at http://localhost:5173"

# Stop all containers
stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# Clean up containers and images
clean: stop
	docker-compose down --rmi all --volumes --remove-orphans
	docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans
	docker system prune -f

# Show logs
logs:
	docker-compose logs -f

# Access container shell
shell:
	docker exec -it git-quest-app sh

# Run tests
test:
	docker run --rm -v $(PWD):/app -w /app node:18-alpine npm test

# Quick start for production
start: build run
	@echo "Git Quest started successfully!"
	@echo "Access the game at http://localhost"

# Quick start for development
start-dev:
	docker-compose -f docker-compose.dev.yml up --build
	@echo "Development server running at http://localhost:5173" 