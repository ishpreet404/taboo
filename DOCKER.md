# Docker Deployment Guide for Taboo Game

This guide explains how to run the Taboo game locally using Docker.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Build and Run with Docker Compose

From the project root directory, run:

```bash
docker-compose up --build
```

This will:
- Build both frontend and backend images
- Start the backend server on `http://localhost:3001`
- Start the frontend on `http://localhost:3000`

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Stop the Application

Press `Ctrl+C` in the terminal, then run:
```bash
docker-compose down
```

## Manual Docker Commands

### Build Images Separately

**Backend:**
```bash
docker build -f Dockerfile.backend -t taboo-backend .
```

**Frontend:**
```bash
docker build -f Dockerfile.frontend -t taboo-frontend .
```

### Run Containers Separately

**Backend:**
```bash
docker run -d -p 3001:3000 --name taboo-backend taboo-backend
```

**Frontend:**
```bash
docker run -d -p 3000:3000 --name taboo-frontend -e NEXT_PUBLIC_SERVER_URL=http://localhost:3001 taboo-frontend
```

## Configuration

### Environment Variables

**Frontend (.env.local):**
- `NEXT_PUBLIC_SERVER_URL` - Backend server URL (default: `http://localhost:3001`)
- `NEXT_PUBLIC_IS_DISCORD_ACTIVITY` - Set to `false` for local deployment
- `NEXT_PUBLIC_DISCORD_CLIENT_ID` - Discord client ID (if using Discord Activity)

**Backend:**
- `PORT` - Server port (default: `3000` inside container, mapped to `3001` on host)
- `NODE_ENV` - Environment (production/development)

### Ports

- **Frontend:** `3000` (host) → `3000` (container)
- **Backend:** `3001` (host) → `3000` (container)

You can change these in `docker-compose.yml`:

```yaml
ports:
  - "YOUR_HOST_PORT:3000"
```

## Docker Compose Services

### Backend Service
- **Container Name:** `taboo-backend`
- **Port:** 3001
- **Dockerfile:** `Dockerfile.backend`

### Frontend Service
- **Container Name:** `taboo-frontend`
- **Port:** 3000
- **Dockerfile:** `Dockerfile.frontend`
- **Depends On:** backend

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process or change ports in docker-compose.yml
```

### Container Won't Start

Check logs:
```bash
docker logs taboo-frontend
docker logs taboo-backend
```

### Rebuild After Code Changes

```bash
docker-compose down
docker-compose up --build
```

### Clear Everything and Start Fresh

```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

## Development vs Production

### Development (Current Setup)
- Source code mounted as volumes (if needed)
- Hot reload disabled in containers
- Use `npm run dev` locally instead

### Production
- Optimized builds
- Minimal image sizes
- Multi-stage builds for frontend
- No dev dependencies

## Docker Image Sizes

- **Backend:** ~150MB (Node.js Alpine + dependencies)
- **Frontend:** ~200MB (Multi-stage build with Next.js standalone)

## Network

Both containers run on the `taboo-network` bridge network, allowing them to communicate with each other.

## Health Checks

To add health checks, update `docker-compose.yml`:

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## Scaling (Optional)

To run multiple backend instances:

```bash
docker-compose up --scale backend=3
```

Note: You'll need to configure a load balancer for this.

## Useful Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker logs -f taboo-frontend
docker logs -f taboo-backend

# Execute commands inside container
docker exec -it taboo-frontend sh
docker exec -it taboo-backend sh

# Stop containers
docker stop taboo-frontend taboo-backend

# Remove containers
docker rm taboo-frontend taboo-backend

# Remove images
docker rmi taboo-frontend taboo-backend

# View Docker networks
docker network ls

# Inspect network
docker network inspect taboo-network
```

## Next Steps

1. **Add SSL/TLS** - Use nginx reverse proxy with Let's Encrypt
2. **Add Redis** - For session management and scaling
3. **Add Monitoring** - Prometheus + Grafana
4. **CI/CD** - Automate builds and deployments
5. **Kubernetes** - For production orchestration

## Support

For issues or questions:
- Check logs: `docker logs <container-name>`
- GitHub Issues: [Create an issue](https://github.com/ishpreet404/taboo/issues)
