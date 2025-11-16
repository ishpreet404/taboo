#!/bin/bash

# Taboo Game - One-Click Deployment Script for Linux
# This script will deploy both frontend and backend and provide you with a public URL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Taboo Game - One-Click Deployment   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js if not present
install_nodejs() {
    echo -e "${YELLOW}Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # Backend dependencies
    if [ -f "package.json" ]; then
        echo -e "${BLUE}Installing backend dependencies...${NC}"
        npm install
    fi
    
    # Frontend dependencies
    if [ -f "frontend/package.json" ]; then
        echo -e "${BLUE}Installing frontend dependencies...${NC}"
        cd frontend
        npm install
        cd ..
    fi
}

# Function to build frontend
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    cd frontend
    
    # Update .env.local with backend URL
    cat > .env.local << EOF
NEXT_PUBLIC_DISCORD_CLIENT_ID=1438092411036237915
DISCORD_CLIENT_SECRET=26b9bc16bc8cc882736c4db4e5bc217a4d8c3e124c476ad13269bbec2ecfb8af
NEXT_PUBLIC_IS_DISCORD_ACTIVITY=false
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
EOF
    
    npm run build
    cd ..
}

# Check for Node.js
if ! command_exists node; then
    echo -e "${RED}Node.js is not installed.${NC}"
    read -p "Would you like to install it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
    else
        echo -e "${RED}Node.js is required. Exiting.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Install dependencies
install_dependencies

# Build frontend
build_frontend

# Kill any existing processes on ports 3000 and 3001
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "node server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

# Start backend
echo -e "${YELLOW}Starting backend server on port 3001...${NC}"
PORT=3001 node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
sleep 3

# Start frontend
echo -e "${YELLOW}Starting frontend server on port 3000...${NC}"
cd frontend
PORT=3000 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for services to start
sleep 5

# Function to create Cloudflare tunnel
create_tunnel() {
    echo -e "${YELLOW}Setting up Cloudflare Tunnel for public access...${NC}"
    
    # Check if cloudflared is installed
    if ! command_exists cloudflared; then
        echo -e "${YELLOW}Installing cloudflared...${NC}"
        
        # Detect architecture
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
        elif [ "$ARCH" = "aarch64" ]; then
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O cloudflared
        else
            echo -e "${RED}Unsupported architecture: $ARCH${NC}"
            exit 1
        fi
        
        chmod +x cloudflared
        sudo mv cloudflared /usr/local/bin/
        echo -e "${GREEN}✓ cloudflared installed${NC}"
    fi
    
    # Start tunnel for frontend
    echo -e "${YELLOW}Creating public tunnel...${NC}"
    nohup cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &
    TUNNEL_PID=$!
    
    # Wait for tunnel to start and extract URL
    sleep 5
    TUNNEL_URL=""
    for i in {1..10}; do
        if [ -f tunnel.log ]; then
            TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' tunnel.log | head -n 1)
            if [ ! -z "$TUNNEL_URL" ]; then
                break
            fi
        fi
        sleep 2
    done
    
    if [ -z "$TUNNEL_URL" ]; then
        echo -e "${RED}Failed to get tunnel URL. Check tunnel.log for details.${NC}"
        cat tunnel.log
        exit 1
    fi
    
    echo -e "${GREEN}✓ Tunnel created (PID: $TUNNEL_PID)${NC}"
    echo "$TUNNEL_PID" > tunnel.pid
}

# Ask user if they want public URL
echo ""
echo -e "${BLUE}Do you want to create a public URL? (requires cloudflared)${NC}"
read -p "Create public tunnel? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_tunnel
    PUBLIC_ACCESS=true
else
    PUBLIC_ACCESS=false
fi

# Save PIDs to file for later cleanup
cat > .deployment.pid << EOF
BACKEND_PID=$BACKEND_PID
FRONTEND_PID=$FRONTEND_PID
TUNNEL_PID=$TUNNEL_PID
EOF

# Display success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🎉 Deployment Successful! 🎉                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Local Access:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:3001${NC}"
echo ""

if [ "$PUBLIC_ACCESS" = true ] && [ ! -z "$TUNNEL_URL" ]; then
    echo -e "${BLUE}Public Access:${NC}"
    echo -e "  ${GREEN}${TUNNEL_URL}${NC}"
    echo ""
    echo -e "${YELLOW}Share this URL with anyone to play together!${NC}"
    echo ""
fi

echo -e "${BLUE}Process IDs:${NC}"
echo -e "  Backend:  ${BACKEND_PID}"
echo -e "  Frontend: ${FRONTEND_PID}"
if [ ! -z "$TUNNEL_PID" ]; then
    echo -e "  Tunnel:   ${TUNNEL_PID}"
fi
echo ""

echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend:  ${GREEN}tail -f backend.log${NC}"
echo -e "  Frontend: ${GREEN}tail -f frontend.log${NC}"
if [ "$PUBLIC_ACCESS" = true ]; then
    echo -e "  Tunnel:   ${GREEN}tail -f tunnel.log${NC}"
fi
echo ""

echo -e "${YELLOW}To stop all services, run:${NC} ${GREEN}./stop.sh${NC}"
echo ""

# Create stop script
cat > stop.sh << 'STOP_SCRIPT'
#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Taboo Game services...${NC}"

if [ -f .deployment.pid ]; then
    source .deployment.pid
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null && echo -e "${GREEN}✓ Backend stopped${NC}" || echo "Backend not running"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null && echo -e "${GREEN}✓ Frontend stopped${NC}" || echo "Frontend not running"
    fi
    
    if [ ! -z "$TUNNEL_PID" ]; then
        kill $TUNNEL_PID 2>/dev/null && echo -e "${GREEN}✓ Tunnel stopped${NC}" || echo "Tunnel not running"
    fi
    
    rm .deployment.pid
else
    echo -e "${YELLOW}No deployment found. Cleaning up any running processes...${NC}"
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    pkill -f "cloudflared tunnel" 2>/dev/null || true
fi

# Clean up log files
rm -f backend.log frontend.log tunnel.log tunnel.pid

echo -e "${GREEN}All services stopped.${NC}"
STOP_SCRIPT

chmod +x stop.sh

# Keep script running and show logs
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Trap Ctrl+C to cleanup
trap './stop.sh; exit' INT TERM

# Show combined logs
tail -f backend.log frontend.log $([ "$PUBLIC_ACCESS" = true ] && echo "tunnel.log") 2>/dev/null
