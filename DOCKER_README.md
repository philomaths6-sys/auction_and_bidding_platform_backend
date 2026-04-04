# Docker Setup for Auction & Bidding Platform

This directory contains the complete Docker configuration for deploying the Auction & Bidding Platform with all services.

## 📁 Files Created

### Frontend (`auction_and_bid_frontend/`)
- **Dockerfile** - Multi-stage build with Node.js build + nginx serving
- **nginx.conf** - Nginx configuration for serving React app and proxying API
- **.dockerignore** - Excludes unnecessary files from Docker context

### Backend (Root)
- **Dockerfile** - Python 3.12 with FastAPI, MySQL client, and uvicorn
- **.dockerignore** - Excludes dev files and dependencies

### Infrastructure
- **docker-compose.yml** - Complete multi-service setup
- **nginx/nginx.conf** - Production nginx with SSL, rate limiting, and load balancing
- **.env.docker** - Environment variables template
- **deploy.sh** - Automated deployment script

## 🐳 Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **frontend** | Custom build | 80 | React app served by nginx |
| **backend** | Custom build | 8000 | FastAPI application |
| **mysql** | mysql:8.0 | 3306 | Database |
| **redis** | redis:7.0-alpine | 6379 | Cache & distributed locks |
| **nginx** | nginx:alpine | 443 | Reverse proxy (production) |

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy
```bash
# Clone and navigate to project
cd auction_bid_backend

# Run deployment script
./deploy.sh
```

### 3. Access Services
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

## 🔧 Configuration

### Environment Variables
Copy `.env.docker` to `.env` and update:
```bash
cp .env.docker .env
# Edit .env with your values
```

Key variables:
- `SECRET_KEY` - JWT signing key (change in production)
- `DATABASE_URL` - MySQL connection string
- `REDIS_URL` - Redis connection string

### SSL Setup (Production)
1. Place SSL certificates in `nginx/ssl/`:
   - `nginx/ssl/cert.pem` - SSL certificate
   - `nginx/ssl/key.pem` - SSL private key

2. Enable production profile:
```bash
docker-compose --profile production up -d
```

## 🛠️ Docker Commands

### Development
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove volumes (clean start)
docker-compose down -v
```

### Production
```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d

# Scale backend services
docker-compose --profile production up -d --scale backend=3
```

### Maintenance
```bash
# Database migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "Description"

# Access database
docker-compose exec mysql mysql -u auction_user -p auction_db

# Access Redis
docker-compose exec redis redis-cli
```

## 📊 Monitoring

### Health Checks
```bash
# Check all services status
docker-compose ps

# Backend health check
curl http://localhost:8000/health

# Database connection
docker-compose exec backend python -c "from app.database import engine; print('DB OK')"
```

### Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🔒 Security Features

### Nginx Configuration
- SSL/TLS termination
- Rate limiting (API: 10 req/s, Login: 5 req/min)
- Security headers (X-Frame-Options, HSTS, etc.)
- Gzip compression
- WebSocket proxy support

### Container Security
- Non-root users in containers
- Minimal base images (alpine)
- Health checks
- Resource limits (can be added to docker-compose)

### Network Security
- Internal Docker network (172.20.0.0/16)
- Only necessary ports exposed
- Service-to-service communication via service names

## 🚀 Performance Optimization

### Frontend
- Static asset caching (1 year)
- Gzip compression
- CDN-ready configuration

### Backend
- Connection pooling (SQLAlchemy)
- Redis caching
- Async/await for I/O operations

### Database
- MySQL 8.0 with InnoDB
- Optimized indexes
- Connection pooling

## 🔄 Scaling

### Horizontal Scaling
```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Add load balancer
docker-compose --profile production up -d
```

### Vertical Scaling
Update resource limits in `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🐛 Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 80, 8000, 3306, 6379 are available
2. **Permission denied**: Ensure deploy.sh is executable: `chmod +x deploy.sh`
3. **Database connection**: Verify MySQL credentials in .env
4. **Build failures**: Check .dockerignore files aren't excluding needed files

### Debug Commands
```bash
# Check container logs
docker-compose logs backend

# Enter container shell
docker-compose exec backend bash

# Check network connectivity
docker-compose exec frontend ping backend
docker-compose exec backend ping mysql
```

## 📝 Notes

- The setup uses a shared internal Docker network (`auction_network`)
- Frontend nginx proxies `/api/` to backend and `/ws/` for WebSockets
- MySQL data persists in `mysql_data` volume
- Redis data persists in `redis_data` volume
- Production profile includes nginx reverse proxy with SSL

## 🔄 Next Steps

1. Update `.env` with production values
2. Add SSL certificates for HTTPS
3. Configure backup strategy for MySQL
4. Set up monitoring (Prometheus/Grafana)
5. Configure CI/CD pipeline
