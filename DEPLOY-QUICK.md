# Deployment Guide - Quick Reference

## 🚀 Recommended: Vercel + Render

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (`ishpreet404/taboo`)
4. Configure:
   - **Name**: `taboo-backend`
   - **Root Directory**: Leave empty (uses root)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **"Create Web Service"**
6. Wait for deployment (2-3 minutes)
7. **Copy your Render URL**: `https://taboo-backend-xxxx.onrender.com`

### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"Add New..."** → **"Project"**
3. Import `ishpreet404/taboo` repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `.next` (auto)
5. Add Environment Variable:
   - **Name**: `NEXT_PUBLIC_SERVER_URL`
   - **Value**: Your Render URL from Step 1
6. Click **"Deploy"**
7. Done! Your app is live! 🎉

### Step 3: Test Your Deployment

1. Open your Vercel URL
2. Create a room
3. Open in another browser/device
4. Join with room code
5. Play!

---

## 📋 Alternative: Netlify + Render

### Step 1: Deploy Backend (Same as above)

Follow Render deployment steps above.

### Step 2: Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub and select `ishpreet404/taboo`
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
5. Add Environment Variable:
   - **Key**: `NEXT_PUBLIC_SERVER_URL`
   - **Value**: Your Render URL
6. Click **"Deploy site"**

---

## 🔧 Important Configuration

### Update netlify.toml (if using Netlify)

The `netlify.toml` is already configured correctly for Next.js deployment.

### Environment Variables

Both platforms need:
```
NEXT_PUBLIC_SERVER_URL=https://your-backend.onrender.com
```

**⚠️ Important:** Replace with your actual Render backend URL!

---

## 💰 Cost

### Free Tier
- **Vercel**: Generous free tier ✅
- **Netlify**: 300 build minutes/month ✅
- **Render**: 750 hours/month (enough for one app) ✅
- **Total**: $0/month! 🎉

### Paid (Optional)
- **Vercel Pro**: $20/month (better performance)
- **Netlify Pro**: $19/month
- **Render Starter**: $7/month (no cold starts)

---

## ⚡ Quick Deploy Commands

### Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy frontend
cd frontend
vercel

# Follow prompts, set root directory to 'frontend'
```

### Using Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy frontend
cd frontend
netlify deploy --prod

# Follow prompts
```

---

## 🐛 Troubleshooting

### "Disconnected" after deployment
- Check that `NEXT_PUBLIC_SERVER_URL` is set correctly
- Verify backend is running (visit Render URL)
- Check browser console for errors

### Build fails
```bash
# Test build locally first
cd frontend
npm run build

# Fix any errors before deploying
```

### Environment variable not working
- Make sure it starts with `NEXT_PUBLIC_`
- Redeploy after adding variables
- Clear browser cache

---

## ✅ Pre-Deployment Checklist

- [ ] Backend code pushed to GitHub
- [ ] Frontend code pushed to GitHub
- [ ] Test build locally: `cd frontend && npm run build`
- [ ] Test backend locally: `node server.js`
- [ ] Both servers work together locally
- [ ] Ready to deploy!

---

## 🎯 After Deployment

Your game will be live at:
- **Frontend**: `https://your-app.vercel.app` or `https://your-app.netlify.app`
- **Backend**: `https://taboo-backend-xxxx.onrender.com`

Share the frontend URL with friends and play! 🎮
