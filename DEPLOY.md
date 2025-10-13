# 🚀 Complete Deployment Guide

## Current Status: ⚠️ NOT READY FOR DEPLOYMENT

Your game needs BOTH frontend and backend deployed to work.

---

## ✅ FULL DEPLOYMENT (Makes Game Functional)

### Prerequisites
- GitHub account
- Vercel account (free)
- Render account (free)

---

### Step 1: Deploy Backend (Render) - 5 minutes

#### Option A: Using Render Dashboard

1. **Go to Render**: https://render.com
2. **Sign up** with GitHub
3. Click **"New +"** → **"Web Service"**
4. **Connect Repository**: Select `ishpreet404/taboo`
5. **Configure**:
   ```
   Name: taboo-backend
   Region: Choose closest to your users
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: npm install
   Start Command: node server.js
   ```
6. **Create Web Service** (FREE plan)
7. **Wait 2-3 minutes** for deployment
8. **IMPORTANT**: Copy your Render URL!
   - Example: `https://taboo-backend-abc123.onrender.com`
   - Save this - you'll need it!

#### Option B: Using Render Blueprint (Faster)

Create `render.yaml` in your repository:
```yaml
services:
  - type: web
    name: taboo-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
```

Then deploy via Render dashboard by importing blueprint.

---

### Step 2: Update Frontend Configuration - 1 minute

**Update** `frontend/.env.local`:
```bash
# Replace with YOUR Render URL from Step 1
NEXT_PUBLIC_SERVER_URL=https://taboo-backend-abc123.onrender.com
```

**Commit changes**:
```bash
git add frontend/.env.local
git commit -m "Update backend URL for production"
git push origin main
```

⚠️ **IMPORTANT**: Don't skip this step or your game won't work!

---

### Step 3: Deploy Frontend (Vercel) - 5 minutes

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with GitHub (if not already)
3. Click **"Add New..."** → **"Project"**
4. **Import** `ishpreet404/taboo` repository
5. **Configure**:
   ```
   Framework Preset: Next.js (auto-detected ✅)
   Root Directory: frontend
   Build Command: npm run build (auto)
   Output Directory: .next (auto)
   Install Command: npm install (auto)
   ```
6. **Add Environment Variable**:
   - Click "Environment Variables"
   - **Name**: `NEXT_PUBLIC_SERVER_URL`
   - **Value**: Your Render URL (e.g., `https://taboo-backend-abc123.onrender.com`)
   - **Environment**: Production (and optionally Preview/Development)
7. Click **"Deploy"**
8. **Wait 2-3 minutes** for build
9. **Done!** 🎉

---

### Step 4: Test Your Deployment

1. **Open** your Vercel URL (e.g., `https://taboo-xxx.vercel.app`)
2. **Check** connection status:
   - Should show "Connected" (green)
   - If "Disconnected" (red), check backend URL
3. **Create a room**
4. **Copy room code**
5. **Open in another browser/device**
6. **Join with code**
7. **Play!** 🎮

---

## 🎯 Quick Deploy Checklist

### Before Deploying:
- [ ] Code pushed to GitHub
- [ ] Test locally: `npm run dev` (both servers)
- [ ] Game works locally
- [ ] Ready to deploy!

### Deploy Backend:
- [ ] Create Render account
- [ ] Deploy to Render
- [ ] Copy Render URL
- [ ] Test backend URL in browser (should see "Cannot GET /")

### Configure Frontend:
- [ ] Update `frontend/.env.local` with Render URL
- [ ] Commit and push changes
- [ ] Verify .env.local has correct URL

### Deploy Frontend:
- [ ] Create Vercel account
- [ ] Import repository
- [ ] Set root directory to `frontend`
- [ ] Add `NEXT_PUBLIC_SERVER_URL` environment variable
- [ ] Deploy
- [ ] Test connection status (should be green)

### Testing:
- [ ] Open Vercel URL
- [ ] Connection shows "Connected"
- [ ] Can create room
- [ ] Can join room from another device
- [ ] Can play game
- [ ] Scores update in real-time
- [ ] All features work!

---

## 🆘 Troubleshooting

### Frontend shows "Disconnected"

**Check:**
1. Backend is running on Render
   - Visit your Render dashboard
   - Service should be "Live" (green)
2. Environment variable is correct
   - Go to Vercel → Project Settings → Environment Variables
   - Verify `NEXT_PUBLIC_SERVER_URL` matches Render URL
   - Must start with `https://`
3. Redeploy frontend after adding env var
   - Vercel → Deployments → Click "..." → Redeploy

**Fix:**
```bash
# Update .env.local
NEXT_PUBLIC_SERVER_URL=https://your-actual-render-url.onrender.com

# Push to GitHub
git add .
git commit -m "Fix backend URL"
git push

# Trigger redeploy in Vercel
```

### Build Fails on Vercel

**Test locally first:**
```bash
cd frontend
npm install
npm run build
```

**Fix errors**, then deploy again.

### Backend Crashes on Render

**Check logs:**
- Render Dashboard → Your Service → Logs

**Common fixes:**
- Ensure `package.json` has all dependencies
- Check Node version compatibility
- Verify `server.js` has no syntax errors

### "Cannot GET /" on Backend

**This is NORMAL!** ✅
- Backend is a WebSocket server, not a website
- It won't show a page when you visit it
- As long as frontend connects, it's working!

---

## 💰 Cost Breakdown

### Free Tier (Recommended for Personal Use)
- **Vercel**: Free forever for personal projects
  - Unlimited deployments
  - Automatic HTTPS
  - Global CDN
- **Render**: 750 hours/month free
  - Enough for one always-on service
  - Automatic HTTPS
  - May have cold starts (30s delay after inactivity)

**Total: $0/month** 🎉

### Paid Tier (For Better Performance)
- **Vercel Pro**: $20/month
  - Better build performance
  - More bandwidth
  - Analytics
- **Render Starter**: $7/month
  - No cold starts
  - Better performance
  - More hours

**Total: $27/month** (optional)

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain to Vercel:
1. Buy domain (Namecheap, GoDaddy, etc.)
2. Vercel → Project → Settings → Domains
3. Add your domain (e.g., `playtaboo.com`)
4. Update DNS records as shown
5. Wait for DNS propagation (10-60 minutes)
6. Done! Access at your domain

### Add Custom Domain to Render:
1. Render → Service → Settings → Custom Domain
2. Add domain (e.g., `api.playtaboo.com`)
3. Update DNS CNAME record
4. Update `NEXT_PUBLIC_SERVER_URL` in Vercel
5. Redeploy frontend

---

## 📈 After Deployment

### Your URLs:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://taboo-backend-xxxx.onrender.com`

### Share & Play:
- Share frontend URL with friends
- They can join from anywhere!
- Enjoy multiplayer Taboo! 🎮

### Monitor Usage:
- Vercel Dashboard: See visits, bandwidth
- Render Dashboard: See server uptime, requests

---

## 🔄 Updates & Maintenance

### To Update the Game:
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```
4. **Automatic deployment!**
   - Vercel auto-deploys from main branch
   - Render auto-deploys from main branch
   - No manual steps needed!

### Check Deployment Status:
- Vercel: Dashboard → Deployments
- Render: Dashboard → Events

---

## ✨ You're All Set!

After following these steps:
- ✅ Backend running on Render
- ✅ Frontend running on Vercel
- ✅ Game fully functional
- ✅ Playable from anywhere
- ✅ Free hosting!

**Now go deploy and share with the world!** 🚀🎉
