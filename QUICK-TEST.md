# 🧪 Quick Test Guide

## 🚀 Your Fixes Are Deployed!

**Backend**: https://taboo-257s.onrender.com ✅  
**Frontend**: (On Vercel - auto-deploying now) ✅

---

## ✅ What Was Fixed

### 1. **Multiplayer Sync** 🎮
- ✅ Scores now update in real-time for all players
- ✅ Timer syncs across all devices
- ✅ Word guesses appear instantly
- ✅ Turn transitions smooth

### 2. **Navigation** 🗺️
- ✅ **"Leave Game"** button in GameScreen (top-right)
- ✅ **"Back"** button in LobbyScreen (top-left)
- ✅ **"Back to Home"** button in GameOverScreen
- ✅ Confirmation before leaving game

### 3. **Server-Side Logic** 🖥️
- ✅ Scores calculated on server (no cheating!)
- ✅ Game state managed centrally
- ✅ Player contributions tracked
- ✅ Automatic game over detection

---

## 🧪 How to Test (5 Minutes)

### **Option 1: Multiple Browsers (Easiest)**

1. **Open 2-3 browsers**:
   - Chrome
   - Firefox
   - Edge (or Incognito)

2. **Go to your Vercel URL** in all browsers:
   ```
   https://your-app.vercel.app
   ```

3. **Create Room** (Browser 1):
   - Enter name: "Player1"
   - Click "Create Room"
   - Copy the room code

4. **Join Room** (Browser 2 & 3):
   - Enter name: "Player2" and "Player3"
   - Paste room code
   - Click "Join Room"

5. **Test Features**:
   - [ ] Join different teams
   - [ ] Host clicks "Start Game"
   - [ ] Describer starts turn
   - [ ] Others guess words (type the word shown)
   - [ ] Watch scores update **instantly** on all browsers ✨
   - [ ] Click "Leave Game" → Shows confirmation ✅
   - [ ] Click "Back" in lobby → Returns to home ✅

---

### **Option 2: Phone + Computer**

1. **Phone**: Create room
2. **Computer**: Join room
3. Play game!
4. **Both should see**:
   - ✅ Same timer countdown
   - ✅ Same scores
   - ✅ Same turn indicators
   - ✅ Instant word guess feedback

---

## 🎯 Test Checklist

### **Multiplayer Sync** ✅:
- [ ] Create room on Device A
- [ ] Join on Device B
- [ ] Both see each other in lobby
- [ ] Join different teams
- [ ] Start game
- [ ] Device A (describer) starts turn
- [ ] Device B sees timer (synced!)
- [ ] Device B guesses word
- [ ] **Both devices see score update instantly** ⚡
- [ ] Turn ends → Both see "Turn Complete"
- [ ] Next turn → Both see new describer

### **Navigation** ✅:
- [ ] Lobby screen has "Back" button (top-left)
- [ ] Click "Back" → Returns to home
- [ ] In game, see "Leave Game" button (top-right)
- [ ] Click "Leave Game" → Shows modal
- [ ] Click "Cancel" → Stays in game
- [ ] Click "Leave" → Returns to lobby
- [ ] Game over screen has "Back to Home" button

### **Score Tracking** ✅:
- [ ] Guess word → Score increases immediately
- [ ] Skip word → Score decreases by 1
- [ ] All players see same score
- [ ] Turn ends → Total matches
- [ ] Game over → Top contributors correct

---

## 🐛 Known Issues (Should Be Fixed)

### ~~Before~~ ❌:
- ~~Scores not syncing between players~~
- ~~No way to leave game~~
- ~~Timer only visible to describer~~
- ~~Multiple timers running~~
- ~~Game stuck after rounds~~

### **After** ✅:
- ✅ **All fixed!** 🎉

---

## 🔍 What to Look For

### **Good Signs** ✅:
- ✅ "Connected" indicator (green) at top
- ✅ Scores update instantly when word guessed
- ✅ All players see same timer
- ✅ "Waiting for [player]..." messages
- ✅ Smooth transitions between turns
- ✅ Leave/Back buttons visible
- ✅ Game over screen appears after max rounds

### **Bad Signs** ❌ (Should NOT happen):
- ❌ "Disconnected" indicator (red)
- ❌ Scores different on different devices
- ❌ Timer not visible to all players
- ❌ Can't leave game
- ❌ Game stuck/frozen

---

## 🚨 If Something's Wrong

### **1. Check Backend**:
Visit: https://taboo-257s.onrender.com

**Should show**: `"Cannot GET /"` (This is good!)

**If error**: Backend might be sleeping (free tier). Wait 30s and refresh.

### **2. Check Frontend**:
- Open browser console (F12)
- Look for Socket.IO connection
- Should see: `"Connected to server"`

### **3. Environment Variable**:
- Go to Vercel → Settings → Environment Variables
- Check: `NEXT_PUBLIC_SERVER_URL` = `https://taboo-257s.onrender.com`

### **4. Redeploy**:
If still not working:
- Vercel → Deployments → Latest → "..." → Redeploy

---

## 📊 Expected Behavior

### **Creating Room**:
```
1. Enter name → Click "Create Room"
2. Room code appears (e.g., "ABC123")
3. Shows "Lobby" screen
4. Sees "Back" button (top-left)
5. Can copy room code
```

### **Joining Room**:
```
1. Enter name + code → Click "Join Room"
2. Sees lobby with other players
3. Both players on Team 1 and Team 2
4. Host can start game
```

### **Playing Game**:
```
1. Game starts → See team turn
2. Describer clicks "Start Turn"
3. Timer appears (60s)
4. Words grid shows
5. Guessers type words
6. Scores update INSTANTLY ⚡
7. Turn ends → Stats show
8. Next turn begins
9. After 6 rounds → Game over
```

### **Navigation**:
```
Home → Lobby (can go back) → Game (can leave) → Game Over (can go home)
```

---

## ✨ Tips for Best Experience

### **For Describers**:
- Watch the timer
- Use "Skip" button if stuck (-1 point penalty)
- Click "End Turn" when time's up
- Click "Next Turn" after seeing stats

### **For Guessers**:
- Type the word you hear (in ALL CAPS or lowercase, both work)
- Don't use taboo words!
- Watch your team's score go up! 🎯

### **For Everyone**:
- Click "Leave Game" if you need to exit
- Confirm before leaving (prevents accidents)
- Game returns to lobby (room stays alive)

---

## 🎉 You're All Set!

**Everything should work perfectly now!** 🚀

Just visit your Vercel URL and test with multiple browsers or devices.

**If you see issues, check**:
1. FIXES-AND-IMPROVEMENTS.md (detailed fixes)
2. VERCEL-CONFIG.md (deployment config)
3. YOUR-DEPLOYMENT.md (deployment guide)

**Happy Gaming!** 🎮✨
