# 🎯 Taboo - Multiplayer Word Guessing Game

A modern, real-time multiplayer word guessing game built with **Next.js**, **Socket.IO**, and **TypeScript**. Players compete in teams to guess words while the describer avoids using "taboo" words.

## 🚀 Features

### 🎮 Real-Time Multiplayer
- **Room-based gameplay**: Create or join rooms with unique codes
- **WebSocket communication**: Real-time game synchronization via Socket.IO
- **Team-based competition**: 2 teams competing simultaneously
- **Live player tracking**: See who's online and on which team
- **Instant updates**: All game state changes sync immediately

### 🎲 Game Mechanics
- **Typing-based guessing**: Players type words to guess them (no clicking!)
- **Auto-recognition**: Instant word validation as you type
- **Massive word database**: **3,259 words** across all difficulty levels!
- **Dynamic word pool**: Words auto-expand as teams progress
- **Smart scoring system**:
  - Easy words: 8-11 points (green)
  - Medium words: 15-28 points (yellow)
  - Hard words: 20-30 points (red)
  - Rare words: Special badges (🔥)
- **60-second turns** with animated countdown
- **Skip penalty**: -1 point for skipped words

### 🎨 Beautiful Modern UI
- **Next.js 14** with App Router
- **Tailwind CSS** for stunning responsive design
- **Framer Motion** animations for smooth transitions
- **Glass morphism** effects with gradient backgrounds
- **Dark theme** with blue/red team colors
- **Lucide icons** for crisp, modern iconography
- **Fully responsive**: Optimized for desktop, tablet, and mobile

## 📋 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web server framework
- **Socket.IO** - WebSocket server for real-time multiplayer
- **CORS** - Cross-origin resource sharing

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** v18 or higher
- **npm** or **yarn**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd taboo
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Start the backend server** (Terminal 1)
   ```bash
   # From the root directory
   node server.js
   ```
   Server will run on `http://localhost:3000`

5. **Start the Next.js frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:3001`

6. **Open your browser**
   ```
   http://localhost:3001
   ```

7. **Play with friends**
   - Open multiple browser tabs/windows
   - Or share your local network IP (e.g., `http://192.168.1.x:3001`)
   - Each player can join with the room code!

## 🌐 Deployment

### Backend Deployment (Choose One)

#### Option 1: Deploy on Render (Recommended)
1. Push code to GitHub
2. Go to [Render](https://render.com)
3. Create New **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
6. Deploy!
7. Copy your Render URL (e.g., `https://your-app.onrender.com`)

#### Option 2: Deploy on Railway
1. Go to [Railway](https://railway.app)
2. Create **New Project** → Deploy from GitHub
3. Select your repository
4. Railway will auto-detect and deploy
5. Copy your Railway URL

#### Option 3: Deploy on Heroku
```bash
heroku create your-taboo-backend
git push heroku main
heroku open
```

### Frontend Deployment (Choose One)

#### Option 1: Deploy on Vercel (Recommended for Next.js)
1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Set **Root Directory**: `frontend`
5. Add Environment Variable:
   - `NEXT_PUBLIC_SERVER_URL` = Your backend URL from above
6. Deploy!

#### Option 2: Deploy on Netlify
```bash
cd frontend
npm run build
netlify deploy --prod
```

Set environment variable in Netlify dashboard:
- `NEXT_PUBLIC_SERVER_URL` = Your backend URL

### Important Notes
⚠️ **Backend and Frontend must be deployed separately**
- Backend needs WebSocket support (Render, Railway, Heroku)
- Frontend can be on Vercel or Netlify
- Update `NEXT_PUBLIC_SERVER_URL` to point to your backend

## 📸 Screenshots

### 🏠 Room Selection
Create or join a room with a unique 6-character code.

### 🎭 Lobby - Team Selection
Players join Team 1 (Blue) or Team 2 (Red) before the game starts.

### 🎮 Active Gameplay
- **Timer countdown** with visual warnings
- **Word grid** with taboo words clearly marked
- **Real-time scoring** and live updates
- **Type-to-guess** input field
- **Team scores** prominently displayed

### 🏆 Game Over
- **Winner announcement** with trophy animation
- **Final scores** for both teams
- **Top contributors** leaderboard
- **Individual statistics** per player

## 🎮 How to Play

### 1. Create/Join Room
- **Create Room**: Enter your name and create a new room
- **Join Room**: Enter your name and the 6-character room code
- Share the room code with friends

### 2. Team Selection
- Join either Team 1 (Blue) or Team 2 (Red)
- Wait for at least 1 player per team
- Host starts the game when ready

### 3. Gameplay
- **Describer's turn**: One player describes words
- **Team guesses**: Other team members type their guesses
- **Avoid taboo words**: Describer can't use the forbidden words
- **Score points**: Correct guesses add points based on difficulty
- **60 seconds per turn**

### 4. Winning
- Play 6 rounds (3 turns per team)
- Team with highest score wins
- Individual contributions are tracked

## 🎯 Game Rules

1. **Describing**:
   - Describe the target word without saying it
   - Avoid all 5 taboo words shown
   - No rhyming or "sounds like" clues

2. **Guessing**:
   - Type words in the input field
   - Case-insensitive matching
   - Unlimited guesses

3. **Scoring**:
   - Correct guess: +10 to +30 points (based on difficulty)
   - Skipped word: -1 point

## 📁 Project Structure

```
taboo/
├── frontend/                    # Next.js Frontend
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles
│   ├── components/              # React Components
│   │   ├── GameContext.tsx      # Game state & Socket.IO
│   │   ├── RoomScreen.tsx       # Create/Join room
│   │   ├── LobbyScreen.tsx      # Team selection
│   │   ├── GameScreen.tsx       # Active gameplay
│   │   └── GameOverScreen.tsx   # Final scores
│   ├── public/                  # Static assets
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── tailwind.config.ts       # Tailwind config
│   ├── next.config.js           # Next.js config
│   └── .env.local               # Environment variables
├── public/                      # Old vanilla JS version
├── server.js                    # Socket.IO backend server
├── package.json                 # Backend dependencies
└── README.md                    # Documentation
```

## 🔧 Configuration

### Frontend Environment Variables
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

For production, update to your production backend URL:
```bash
NEXT_PUBLIC_SERVER_URL=https://your-backend-server.com
```

### Change Game Settings
Edit `frontend/components/GameContext.tsx`:
```typescript
maxRounds: 6,        // Number of rounds
turnTime: 60,        // Seconds per turn
```

### Add More Words
The game includes **3,259 words** from `wordlist.txt`!

To customize, edit `frontend/lib/wordDatabase.ts`:
```typescript
const relatedWords: Record<string, string[]> = {
  'YOUR_WORD': ['TABOO1', 'TABOO2', 'TABOO3', 'TABOO4', 'TABOO5'],
  // Add custom taboo words for better gameplay!
}
```

See **WORDS.md** for complete word database documentation.

### Customize Styling
- Edit `frontend/tailwind.config.ts` for theme colors
- Edit `frontend/app/globals.css` for global styles
- Modify component styles inline with Tailwind classes

## 🎨 UI Features

### 🌈 Visual Design
- **Gradient backgrounds**: Smooth blue-to-purple gradients
- **Glass morphism**: Frosted glass effect on cards
- **Smooth animations**: Framer Motion for silky transitions
- **Hover effects**: Interactive button states
- **Pulse animations**: Timer warnings and celebrations
- **Badge system**: Rare word indicators
- **Team colors**: Clear visual distinction (Blue vs Red)

### 📱 Responsive Design
- **Mobile-first**: Optimized for small screens
- **Tablet support**: Grid layouts adapt beautifully
- **Desktop**: Full-width experience with optimal spacing
- **Touch-friendly**: Large tap targets for mobile

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend connection issues
- Ensure `server.js` is running on port 3000
- Check `frontend/.env.local` has correct server URL
- Verify CORS is enabled in `server.js`

### "Disconnected" Status
- Backend server must be running (`node server.js`)
- Check browser console for Socket.IO errors
- Verify firewall isn't blocking port 3000

### Room Not Found
- Ensure room code is correct (6 characters)
- Room is deleted when all players leave
- Create a new room if expired

### Game Not Starting
- Need at least 1 player per team
- Only the host (room creator) can start
- All players must join a team first

### TypeScript Errors
```bash
cd frontend
npm run build
```
This will show any type errors before deploying

## ✨ Features Showcase

### 🎯 Core Gameplay
- ✅ **Real-time multiplayer** - Play with friends anywhere
- ✅ **Type-based guessing** - No clicking, just type!
- ✅ **Smart word matching** - Instant validation
- ✅ **Dynamic difficulty** - Easy, Medium, Hard, Rare words
- ✅ **Team-based scoring** - Compete for glory
- ✅ **60-second rounds** - Fast-paced action
- ✅ **Skip penalties** - Strategic decisions matter

### 🎨 Modern UI/UX
- ✅ **Beautiful animations** - Smooth Framer Motion transitions
- ✅ **Glass morphism design** - Modern frosted glass effects
- ✅ **Gradient backgrounds** - Eye-catching color schemes
- ✅ **Responsive layout** - Perfect on any device
- ✅ **Dark theme** - Easy on the eyes
- ✅ **Interactive elements** - Hover effects and feedback
- ✅ **Team color coding** - Clear visual distinction

### 🚀 Technical Excellence
- ✅ **Next.js 14** - Latest React framework
- ✅ **TypeScript** - Type-safe code
- ✅ **Tailwind CSS** - Rapid styling
- ✅ **Socket.IO** - Reliable real-time sync
- ✅ **Room-based architecture** - Scalable multiplayer
- ✅ **Zero-config deployment** - Easy to host

## 🎮 Game Modes & Rules

### Standard Mode (Current)
- **Teams**: 2 teams competing
- **Players**: Unlimited per team
- **Rounds**: 6 rounds (3 per team)
- **Turn Time**: 60 seconds
- **Scoring**: Points based on word difficulty
- **Winner**: Highest score after all rounds

### Possible Future Modes
- 🔜 **Quick Play**: 3 rounds, 30-second turns
- 🔜 **Marathon**: 12 rounds, 90-second turns
- 🔜 **Solo Practice**: Practice describing alone
- � **Custom Rules**: Adjustable settings per room

## 🤝 Contributing

Want to improve the game? Here's how:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Ideas for Contributions
- 📝 Add more words to the database
- 🎨 Create new themes or color schemes
- 🌍 Add internationalization (i18n)
- 🎵 Add sound effects
- 💬 Add in-game chat
- 📊 Add player statistics tracking
- 🏅 Add achievements system
- 🎯 Add difficulty levels for rooms

## �📝 License

MIT License - Feel free to use this project for learning or your own games!

## 🙏 Acknowledgments

- **Socket.IO** - For reliable real-time communication
- **Next.js Team** - For the amazing React framework
- **Vercel** - For excellent hosting platform
- **Tailwind CSS** - For making styling enjoyable
- **Framer Motion** - For beautiful animations
- **Lucide** - For beautiful open-source icons

## 📞 Support

Having issues? Here's how to get help:

1. **Check the Troubleshooting section** above
2. **Open an issue** on GitHub with:
   - What you were trying to do
   - What happened instead
   - Browser console errors (F12 → Console)
   - Screenshots if relevant

---

**Ready to play?** 🎮

1. Make sure both servers are running:
   - Backend: `node server.js` (port 3000)
   - Frontend: `cd frontend && npm run dev` (port 3001)

2. Open `http://localhost:3001` in your browser

3. Create a room and share the code with friends!

**Enjoy the game!** 🎉🎯


