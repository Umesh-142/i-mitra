#!/bin/bash

# i-Mitra Setup Script
# Indore Smart City - Intelligent Multi-Role Grievance Management System

echo "🔥 Setting up i-Mitra: Indore Smart City Grievance Management Platform"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
        
        # Check if version is >= 18
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_status "Node.js version is compatible"
        else
            print_error "Node.js version must be 18 or higher. Current: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
}

# Check if MongoDB is running
check_mongodb() {
    if command -v mongod >/dev/null 2>&1; then
        print_status "MongoDB is installed"
        
        # Try to connect to MongoDB
        if mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; then
            print_status "MongoDB is running"
        else
            print_warning "MongoDB is installed but not running"
            print_info "Starting MongoDB service..."
            
            # Try different methods to start MongoDB
            if command -v systemctl >/dev/null 2>&1; then
                sudo systemctl start mongod 2>/dev/null || print_warning "Could not start MongoDB with systemctl"
            elif command -v service >/dev/null 2>&1; then
                sudo service mongod start 2>/dev/null || print_warning "Could not start MongoDB with service"
            else
                print_warning "Please start MongoDB manually"
            fi
        fi
    else
        print_error "MongoDB is not installed. Please install MongoDB 5.0 or higher."
        print_info "You can also use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    
    # Install root dependencies
    if npm install; then
        print_status "Root dependencies installed"
    else
        print_error "Failed to install root dependencies"
        exit 1
    fi
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    if npm install; then
        print_status "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    cd ..
    
    # Install frontend dependencies
    print_info "Installing frontend dependencies..."
    cd frontend
    if npm install; then
        print_status "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
}

# Setup environment files
setup_environment() {
    print_info "Setting up environment configuration..."
    
    # Copy backend environment file
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_status "Backend environment file created"
        print_warning "Please update backend/.env with your configuration"
    else
        print_info "Backend environment file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p backend/uploads/complaints
    mkdir -p backend/logs
    
    print_status "Directories created"
}

# Seed database
seed_database() {
    print_info "Seeding database with demo data..."
    
    cd backend
    if npm run seed; then
        print_status "Database seeded successfully"
        echo ""
        print_info "🔑 Demo Credentials:"
        echo "   Admin:   admin@imitra.gov.in / admin123"
        echo "   Citizen: rajesh.kumar@gmail.com / citizen123"
        echo "   Officer: suresh.gupta@pwd.gov.in / officer123"
        echo "   Mitra:   ramesh.yadav@pwd.gov.in / mitra123"
        echo ""
    else
        print_error "Failed to seed database"
        print_warning "You can try running 'npm run seed' manually later"
    fi
    cd ..
}

# Main setup function
main() {
    echo ""
    print_info "Starting i-Mitra setup process..."
    echo ""
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_nodejs
    check_mongodb
    echo ""
    
    # Install dependencies
    install_dependencies
    echo ""
    
    # Setup environment
    setup_environment
    echo ""
    
    # Create directories
    create_directories
    echo ""
    
    # Seed database
    seed_database
    echo ""
    
    # Final instructions
    print_status "🎉 i-Mitra setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "   1. Update backend/.env with your API keys and configuration"
    echo "   2. Start the application: npm run dev"
    echo "   3. Access the application:"
    echo "      • Frontend: http://localhost:5173"
    echo "      • Backend:  http://localhost:5000"
    echo "      • API Health: http://localhost:5000/api/health"
    echo ""
    print_info "For detailed documentation, see README.md"
    echo ""
    print_status "Happy coding! 🚀"
}

# Run main function
main