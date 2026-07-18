#!/bin/bash

# PastureScan Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies before continuing."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Load environment variables
load_env() {
    local env_file=".env"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file $env_file not found"
        log_info "Creating from example file..."
        cp .env.example .env
        log_warning "Please edit .env file with your configuration before running again"
        exit 1
    fi
    
    log_info "Loading environment variables..."
    set -a
    source "$env_file"
    set +a
    log_success "Environment variables loaded"
}

# Build all services
build_services() {
    log_info "Building Docker images..."
    
    # Build backend services
    for service in api-gateway auth-service image-processing-service ml-prediction-service data-service; do
        log_info "Building $service..."
        docker build -t pasturescan/$service:latest ./backend-services/$service
    done
    
    log_success "All Docker images built successfully"
}

# Start services
start_services() {
    local compose_file=$1
    local cmd=$2
    
    log_info "Starting services with $compose_file..."
    
    if [ "$cmd" = "up" ]; then
        docker-compose -f "$compose_file" up -d
    else
        docker-compose -f "$compose_file" "$cmd"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Services started successfully"
    else
        log_error "Failed to start services"
        exit 1
    fi
}

# Stop services
stop_services() {
    local compose_file=$1
    
    log_info "Stopping services..."
    docker-compose -f "$compose_file" down
    
    log_success "Services stopped"
}

# Check service health
check_health() {
    log_info "Checking service health..."
    
    local services=(
        "http://localhost:8000/health"
        "http://localhost:8001/health"
        "http://localhost:8002/health"
        "http://localhost:8003/health"
        "http://localhost:8004/health"
    )
    
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if curl -f -s "$service" > /dev/null 2>&1; then
            log_success "Service $service is healthy"
        else
            log_error "Service $service is not responding"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log_success "All services are healthy!"
    else
        log_warning "Some services are not healthy. Check logs for details."
    fi
}

# Backup database
backup_database() {
    local backup_dir="./backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="pasturescan_backup_$timestamp.sql"
    
    log_info "Creating database backup..."
    
    mkdir -p "$backup_dir"
    
    docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_dir/$backup_file"
    
    if [ $? -eq 0 ]; then
        log_success "Database backup created: $backup_dir/$backup_file"
    else
        log_error "Failed to create database backup"
    fi
}

# Show logs
show_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        log_info "Showing logs for all services..."
        docker-compose logs -f
    else
        log_info "Showing logs for $service..."
        docker-compose logs -f "$service"
    fi
}

# Main deployment function
deploy() {
    local environment=$1
    local compose_file="docker-compose.yml"
    
    case $environment in
        "dev")
            compose_file="docker-compose.yml"
            ;;
        "prod")
            compose_file="docker-compose.prod.yml"
            ;;
        *)
            log_error "Invalid environment: $environment. Use 'dev' or 'prod'"
            exit 1
            ;;
    esac
    
    log_info "Starting deployment for $environment environment..."
    
    check_dependencies
    load_env
    build_services
    stop_services "$compose_file"
    start_services "$compose_file" "up"
    
    log_info "Waiting for services to start..."
    sleep 30
    
    check_health
    
    log_success "Deployment completed successfully!"
    log_info "API Gateway is available at: http://localhost:8000"
    log_info "Check service status with: ./deploy.sh status"
}

# Usage information
usage() {
    echo "PastureScan Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy [dev|prod]    Deploy to development or production environment"
    echo "  start [dev|prod]     Start services"
    echo "  stop [dev|prod]      Stop services"
    echo "  restart [dev|prod]   Restart services"
    echo "  status               Check service status"
    echo "  build                Build Docker images"
    echo "  logs [service]       Show service logs"
    echo "  backup               Create database backup"
    echo "  update               Update to latest version"
    echo "  help                 Show this help message"
    echo ""
}

# Main script execution
case $1 in
    "deploy")
        deploy "$2"
        ;;
    "start")
        load_env
        start_services "docker-compose.yml" "up -d"
        ;;
    "stop")
        load_env
        stop_services "docker-compose.yml"
        ;;
    "restart")
        load_env
        stop_services "docker-compose.yml"
        start_services "docker-compose.yml" "up -d"
        ;;
    "status")
        check_health
        ;;
    "build")
        load_env
        build_services
        ;;
    "logs")
        show_logs "$2"
        ;;
    "backup")
        load_env
        backup_database
        ;;
    "update")
        log_info "Updating to latest version..."
        git pull
        deploy "$2"
        ;;
    "help"|"")
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac