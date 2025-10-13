# 🚀 Deployment Checklist

## Pre-Deployment

### ✅ Code Ready
- [ ] All features tested locally
- [ ] No console errors in browser (F12)
- [ ] Backend server runs without errors
- [ ] Frontend builds successfully (`cd frontend && npm run build`)
- [ ] Both servers tested together

### ✅ Repository Setup
- [ ] Code pushed to GitHub/GitLab
- [ ] `.gitignore` includes `node_modules`, `.env`, `.next`
- [ ] README.md is up to date
- [ ] License file added (if needed)

---

## Backend Deployment (Choose One)

### Option A: Render.com (Recommended)

#### Setup
- [ ] Create account at [render.com](https://render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Select your repository

#### Configuration
- [ ] **Name**: `taboo-backend` (or your choice)
- [ ] **Environment**: Node
- [ ] **Region**: Choose closest to users
- [ ] **Branch**: `main`
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `node server.js`
- [ ] **Plan**: Free (or paid for better performance)

#### After Deployment
- [ ] Copy your Render URL (e.g., `https://taboo-backend.onrender.com`)
- [ ] Test WebSocket connection
- [ ] Save URL for frontend configuration

---

### Option B: Railway.app

#### Setup
- [ ] Create account at [railway.app](https://railway.app)
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Connect your repository

#### Configuration
- [ ] Railway auto-detects Node.js
- [ ] Will run `node server.js` automatically
- [ ] Custom domain (optional): Settings → Networking

#### After Deployment
- [ ] Copy your Railway URL
- [ ] Test connection
- [ ] Save URL for frontend

---

### Option C: Heroku

#### Setup
```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create taboo-backend

# Deploy
git push heroku main

# Open
heroku open
```

#### Configuration
- [ ] Procfile created: `web: node server.js`
- [ ] Environment variables set (if any)
- [ ] Copy Heroku URL

---

## Frontend Deployment

### Option A: Vercel (Recommended for Next.js)

#### Setup
- [ ] Create account at [vercel.com](https://vercel.com)
- [ ] Click "Add New Project"
- [ ] Import your GitHub repository

#### Configuration
- [ ] **Root Directory**: `frontend`
- [ ] **Framework Preset**: Next.js (auto-detected)
- [ ] **Build Command**: `npm run build` (auto)
- [ ] **Output Directory**: `.next` (auto)
- [ ] **Install Command**: `npm install` (auto)

#### Environment Variables
Add in Vercel dashboard:
- [ ] `NEXT_PUBLIC_SERVER_URL` = Your backend URL (from above)
  - Example: `https://taboo-backend.onrender.com`

#### After Deployment
- [ ] Test the app
- [ ] Create a room
- [ ] Join from different devices
- [ ] Verify WebSocket connection

---

### Option B: Netlify

#### Setup
- [ ] Create account at [netlify.com](https://netlify.com)
- [ ] Click "Add new site" → "Import from Git"
- [ ] Connect GitHub repository

#### Configuration
- [ ] **Base directory**: `frontend`
- [ ] **Build command**: `npm run build`
- [ ] **Publish directory**: `frontend/.next`

#### Environment Variables
Add in Netlify dashboard:
- [ ] `NEXT_PUBLIC_SERVER_URL` = Your backend URL

---

## Post-Deployment Testing

### ✅ Functional Tests
- [ ] Frontend loads without errors
- [ ] Can create a room
- [ ] Room code is generated
- [ ] Can join a room with code
- [ ] Players see each other in lobby
- [ ] Can join teams
- [ ] Host can start game
- [ ] Timer counts down
- [ ] Can guess words by typing
- [ ] Scores update in real-time
- [ ] Can skip words
- [ ] Turn ends properly
- [ ] Next turn starts correctly
- [ ] Game over screen displays
- [ ] Can return to room selection

### ✅ Performance Tests
- [ ] Page loads in < 3 seconds
- [ ] Smooth animations
- [ ] No lag during gameplay
- [ ] WebSocket stays connected
- [ ] Works on mobile devices
- [ ] Works on different browsers (Chrome, Firefox, Safari)

### ✅ Multiplayer Tests
- [ ] Multiple players can join same room
- [ ] All players see same game state
- [ ] Guesses sync across clients
- [ ] Scores update for everyone
- [ ] Disconnection handled gracefully
- [ ] Reconnection works

---

## Custom Domain (Optional)

### For Vercel Frontend
- [ ] Go to Project Settings → Domains
- [ ] Add your domain (e.g., `play-taboo.com`)
- [ ] Configure DNS with your registrar
- [ ] Wait for SSL certificate

### For Render Backend
- [ ] Go to Settings → Custom Domain
- [ ] Add subdomain (e.g., `api.play-taboo.com`)
- [ ] Configure DNS
- [ ] Update frontend env variable with new URL

---

## Production Checklist

### ✅ Security
- [ ] No sensitive data in code
- [ ] Environment variables used correctly
- [ ] CORS properly configured
- [ ] Rate limiting considered (if needed)

### ✅ Performance
- [ ] Frontend production build tested
- [ ] Images optimized (if any)
- [ ] Bundle size reasonable
- [ ] Backend handles concurrent connections

### ✅ Monitoring (Optional but Recommended)
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Analytics (Google Analytics, Plausible)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring (Vercel Analytics)

### ✅ Documentation
- [ ] README updated with live URLs
- [ ] How to play guide available
- [ ] Support contact information
- [ ] License information

---

## 🎉 You're Live!

### Share Your Game:
- **Frontend URL**: `https://your-app.vercel.app`
- **Backend URL**: `https://your-backend.onrender.com`

### Promote:
- [ ] Share on social media
- [ ] Tell friends and family
- [ ] Post on Reddit (r/WebGames, r/SideProject)
- [ ] Share on Discord servers
- [ ] Add to game directories

---

## 🆘 Troubleshooting Deployment

### Frontend Issues

**Build Fails**
```bash
cd frontend
npm run build
# Check errors and fix
```

**Environment Variable Not Working**
- Redeploy after adding env vars
- Ensure `NEXT_PUBLIC_` prefix
- Check spelling exactly

**Page Not Loading**
- Check build logs in Vercel/Netlify
- Verify build succeeded
- Check browser console for errors

### Backend Issues

**WebSocket Not Connecting**
- Ensure server is running (check logs)
- Verify URL in frontend env variable
- Check CORS settings
- Test WebSocket directly

**Server Crashes**
- Check Render/Railway logs
- Look for error messages
- Verify Node.js version compatibility
- Check for missing dependencies

**Port Issues**
- Use `process.env.PORT` in server.js
- Don't hardcode port 3000 for production

### Connection Issues

**"Disconnected" Status**
- Backend server must be running
- Check backend URL in frontend
- Verify WebSocket support on host
- Check firewall settings

**Rooms Not Working**
- Test backend independently
- Check Socket.IO events in console
- Verify event names match
- Test with curl or Postman

---

## 📊 Cost Estimation

### Free Tier (Both Free!)
- **Vercel**: Free for personal projects, unlimited deployments
- **Render**: 750 hours/month free (enough for one app)
- **Total**: $0/month 🎉

### Paid Tier (Optional)
- **Vercel Pro**: $20/month (better performance, analytics)
- **Render Starter**: $7/month (better uptime, no cold starts)
- **Total**: $27/month for professional hosting

---

## 🎯 Success Metrics

After deployment, track:
- [ ] Number of active rooms
- [ ] Number of players
- [ ] Average game duration
- [ ] Most popular words
- [ ] Error rates
- [ ] Page load times
- [ ] WebSocket connection success rate

---

## ✅ Deployment Complete!

**Congratulations!** Your game is now live and accessible to anyone with internet! 🎉

**Next**: Share the link and watch people play!
