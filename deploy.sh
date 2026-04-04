#!/bin/bash

# Docker deployment script for Auction & Bidding Platform

set -e

echo "🚀 Starting Docker deployment for Auction & Bidding Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p mysql-init

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please update the .env file with your actual configuration values."
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend alembic upgrade head

# Seed initial data
echo "🌱 Seeding initial data..."
docker-compose exec backend python -c "
from app.database import engine
from sqlalchemy.orm import sessionmaker
from app.models.auction import Category
import asyncio

async def seed_data():
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Create default category if not exists
    existing = session.query(Category).filter_by(name='Electronics').first()
    if not existing:
        electronics = Category(
            name='Electronics',
            description='Electronic devices and gadgets'
        )
        session.add(electronics)
        session.commit()
        print('✅ Default category created')
    else:
        print('✅ Default category already exists')
    
    session.close()

asyncio.run(seed_data())
"

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Services are running:"
echo "   Frontend: http://localhost:80"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo "   MySQL: localhost:3306"
echo "   Redis: localhost:6379"
echo ""
echo "📊 Check service status:"
echo "   docker-compose ps"
echo ""
echo "📋 View logs:"
echo "   docker-compose logs -f [service_name]"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
