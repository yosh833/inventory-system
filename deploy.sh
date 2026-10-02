#!/bin/bash
# ============================================
# Inventory System - Deployment Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="inventory-system"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check .env file
    if [ ! -f .env ]; then
        log_warning ".env file not found, copying from .env.example"
        cp .env.example .env
        log_warning "Please edit .env with your production values before deploying"
    fi

    log_success "Requirements check passed"
}

deploy_local() {
    log_info "Starting local deployment with Docker Compose..."

    check_requirements

    # Build and start services
    log_info "Building and starting services..."
    docker-compose up -d --build

    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    sleep 10

    # Check health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
        docker-compose logs backend
        exit 1
    fi

    if curl -f http://localhost:5173/health > /dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        docker-compose logs frontend
        exit 1
    fi

    log_success "Local deployment complete!"
    log_info "Frontend: http://localhost:5173"
    log_info "Backend API: http://localhost:3001"
    log_info "Health check: http://localhost:3001/health"
}

deploy_production() {
    log_info "Starting production deployment with Docker Compose..."

    check_requirements

    # Verify required env vars
    if [ -z "$JWT_SECRET" ] || [ -z "$COOKIE_SECRET" ] || [ -z "$FRONTEND_URL" ]; then
        log_error "Missing required environment variables for production:"
        log_error "  JWT_SECRET, COOKIE_SECRET, FRONTEND_URL"
        exit 1
    fi

    # Check SSL certificates
    if [ ! -f "./ssl/fullchain.pem" ] || [ ! -f "./ssl/privkey.pem" ]; then
        log_warning "SSL certificates not found in ./ssl/"
        log_warning "Generate them with Let's Encrypt or use self-signed for testing"
    fi

    log_info "Building and starting production services..."
    docker-compose --profile production up -d --build

    # Wait for services
    log_info "Waiting for services to be ready..."
    sleep 15

    # Health checks
    if curl -f https://localhost/health > /dev/null 2>&1; then
        log_success "Production deployment healthy"
    else
        log_error "Health check failed"
        docker-compose --profile production logs
        exit 1
    fi

    log_success "Production deployment complete!"
    log_info "Application: https://your-domain.com"
}

deploy_railway_netlify() {
    log_info "Deploying to Railway (Backend) + Netlify (Frontend)..."

    # Check if git is clean
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Working directory not clean. Commit changes first."
        git status --short
    fi

    # Push to main branch triggers GitHub Actions
    log_info "Pushing to GitHub (triggers CI/CD)..."
    git push origin main

    log_success "Push complete. Check GitHub Actions for deployment status."
    log_info "Railway: https://railway.app/dashboard"
    log_info "Netlify: https://app.netlify.com/sites/your-site"
}

stop_services() {
    log_info "Stopping services..."
    docker-compose down
    docker-compose --profile production down
    log_success "Services stopped"
}

clean_all() {
    log_warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --rmi all
        docker-compose --profile production down -v --rmi all
        docker system prune -f
        log_success "Cleanup complete"
    else
        log_info "Cleanup cancelled"
    fi
}

show_logs() {
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$SERVICE"
    fi
}

show_status() {
    log_info "Service Status:"
    docker-compose ps
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream
}

# ============================================
# Main
# ============================================

case "${1:-}" in
    local)
        deploy_local
        ;;
    production)
        deploy_production
        ;;
    railway)
        deploy_railway_netlify
        ;;
    stop)
        stop_services
        ;;
    clean)
        clean_all
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {local|production|railway|stop|clean|logs|status}"
        echo ""
        echo "Commands:"
        echo "  local       - Deploy locally with Docker Compose (dev)"
        echo "  production  - Deploy with SSL/Nginx (production)"
        echo "  railway     - Push to GitHub for Railway + Netlify CI/CD"
        echo "  stop        - Stop all services"
        echo "  clean       - Remove all containers, volumes, images"
        echo "  logs [svc]  - Show logs (optionally for specific service)"
        echo "  status      - Show service status and resource usage"
        exit 1
        ;;
esac