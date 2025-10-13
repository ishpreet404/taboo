# 🚀 Quick Start Guide

## Method 1: Easy Start (Windows)
Just double-click `start.bat` - it will open both servers automatically!

## Method 2: NPM Script (All Platforms)
```bash
npm run dev
```
This runs both backend and frontend simultaneously.

## Method 3: Manual Start (Two Terminals)

### Terminal 1 - Backend
```bash
node server.js
```
Backend runs on: http://localhost:3000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:3001

## 🎮 Open the Game

Open your browser and go to:
```
http://localhost:3001
```

## 📱 Play with Friends

### On Same Network
1. Find your local IP:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`
2. Share with friends: `http://YOUR-IP:3001`
3. Example: `http://192.168.1.100:3001`

### Over Internet
Deploy to Vercel (frontend) and Render (backend) - see README.md

## ✅ Checklist

- [ ] Node.js installed (v18+)
- [ ] Dependencies installed (`npm install` in root and `frontend/`)
- [ ] Both servers running
- [ ] Browser opened to http://localhost:3001
- [ ] Room created or joined
- [ ] Friends invited with room code

## 🎯 First Time Setup

```bash
# 1. Install root dependencies
npm install

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Go back to root
cd ..

# 4. Start both servers
npm run dev
```

## 🆘 Common Issues

### Port Already in Use
If port 3000 or 3001 is taken:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Cannot Connect
1. Make sure backend is running (Terminal 1)
2. Check frontend .env.local has correct URL
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito/private window

### Dependencies Error
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 🎉 You're Ready!

Create a room, invite friends, and start playing!
