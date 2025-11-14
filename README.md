# 🎯 LocusFocus (Social Shield)

A powerful Chrome extension to block distracting websites and stay focused, featuring **Ultra Lock** (timer-based blocking) and **Mutual Lock** (partner accountability).

## ✨ Features

- **One-Click Blocking** - Toggle social media blocking on/off
- **Ultra Lock** - Set a timer and lock yourself out (cannot cancel!)
- **Mutual Lock** - Partner with someone for mutual accountability
- **Custom Domains** - Add your own blocked websites
- **Real-time Sync** - Lock/unlock syncs instantly with partner
- **Dark Mode** - Beautiful light/dark themes
- **No Firebase Required** - Self-hosted backend option

## 🚀 Quick Start

### Option 1: Local Development (2 min)

```bash
# 1. Start backend
cd Server
npm install
npm start

# 2. Load extension
# Chrome → chrome://extensions/ → Developer mode → Load unpacked → select social-shield-v67 folder

# 3. Configure
# Extension options → Backend URL: http://localhost:3000 → Enable Backend → Save
```

### Option 2: Production (5 min)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- Deploy to Render (free, 5 min)
- Deploy to Railway (free, 3 min)
- Deploy to VPS (self-hosted)

## 📁 Project Structure

```
Social Shield/
├── Server/                      # Backend server (replaces Firebase)
│   ├── server.js               # Express + WebSocket server
│   ├── database.js             # SQLite database layer
│   ├── package.json            # Dependencies
│   ├── Dockerfile              # Docker deployment
│   ├── docker-compose.yml      # Docker Compose config
│   ├── README.md               # Server documentation
│   └── QUICKSTART.md           # Quick setup guide
│
├── social-shield-v67/          # Chrome extension
│   ├── manifest.json           # Extension manifest
│   ├── service_worker.js       # Background service worker
│   ├── backend-api.js          # Custom backend API client
│   ├── firebase.js             # Firebase client (optional)
│   ├── popup.html/js           # Extension popup
│   ├── options.html/js         # Settings page
│   ├── blocked.html            # Blocked page
│   ├── styles.css              # Global styles
│   ├── social_domains.js       # Default blocked sites
│   └── icons/                  # Extension icons
│
├── DEPLOYMENT.md               # Complete deployment guide
├── FIREBASE_VS_BACKEND.md      # Backend comparison
└── README.md                   # This file
```

## 🔧 Backend Options

LocusFocus supports **two backends**:

### 1. Custom Backend (Recommended)
- ✅ Self-hosted Node.js server
- ✅ Full data control
- ✅ Simple setup (just URL)
- ✅ Free hosting (Render/Railway)
- ✅ SQLite database (upgradable)

### 2. Firebase (Original)
- ✅ Google Cloud infrastructure
- ✅ Auto-scaling
- ✅ Offline support
- ❌ More complex setup
- ❌ Data on Google servers

See **[FIREBASE_VS_BACKEND.md](FIREBASE_VS_BACKEND.md)** for comparison.

## 🎮 Usage

### Basic Blocking

1. Click extension icon
2. Toggle blocking on/off
3. Blocked sites show block page

### Ultra Lock (Self-Lock with Timer)

1. Click extension icon
2. Enter minutes (e.g., 30, 60, 120)
3. Click "Start Ultra Lock"
4. **Cannot be cancelled** until timer expires
5. Automatic unlock when time's up

### Mutual Lock (Partner Accountability)

**Setup:**
1. Deploy backend (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. Both partners: Options → Enter backend URL
3. Both partners: Use **same Room Code**, **different User IDs**
4. Enable Mutual Lock → Save

**Usage:**
- **Lock yourself**: Click "Lock Me" (partner can unlock you)
- **Lock partner**: Click "Lock Partner" (they can't unlock themselves)
- **Unlock partner**: Click "Unlock Partner" (restore their access)

### Custom Blocked Sites

1. Options → Blocked websites
2. Add domains (one per line):
   ```
   facebook.com
   instagram.com
   twitter.com
   reddit.com
   ```
3. Save

## 🏗️ Architecture

```
┌─────────────────┐
│ Chrome Extension│
│  (Frontend)     │
└────────┬────────┘
         │
         │ WebSocket + REST
         │
┌────────▼────────┐
│ Backend Server  │
│  (Node.js)      │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│ SQLite Database │
│  (Persistent)   │
└─────────────────┘
```

**Real-time sync:**
- WebSocket for instant lock/unlock notifications
- REST API for lock state management
- SQLite for persistent data storage

## 🛠️ Tech Stack

### Extension
- Manifest V3
- Chrome Declarative Net Request API
- WebSocket client
- ES6 modules

### Backend
- Node.js + Express
- WebSocket (ws library)
- SQLite (better-sqlite3)
- RESTful API

### Deployment
- Render / Railway (free hosting)
- Docker / Docker Compose
- Nginx (optional reverse proxy)

## 📊 API Endpoints

```
GET  /health                              # Health check
POST /api/rooms/:roomId/join              # Join room
GET  /api/rooms/:roomId                   # Get room state
POST /api/rooms/:roomId/lock              # Set lock
GET  /api/rooms/:roomId/locks/:userId     # Get lock status
```

WebSocket events:
- `join` - Join room for real-time updates
- `state` - Receive room state
- `lock_changed` - Lock status changed
- `user_joined` - User joined room

## 🔒 Security

- Room-based access control
- JWT secret for production
- HTTPS/WSS in production (auto on Render/Railway)
- Data stays on your server (custom backend)
- No authentication required (trust-based system)

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide (Render, Railway, VPS, Docker)
- **[Server/README.md](Server/README.md)** - Backend server documentation
- **[Server/QUICKSTART.md](Server/QUICKSTART.md)** - Quick start guide
- **[FIREBASE_VS_BACKEND.md](FIREBASE_VS_BACKEND.md)** - Backend comparison

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Add PostgreSQL support for high-scale deployments
- [ ] Implement user authentication (JWT, OAuth)
- [ ] Add admin dashboard
- [ ] Browser sync (Firefox, Edge support)
- [ ] Mobile app companion
- [ ] Analytics dashboard
- [ ] Scheduled blocking (time-based rules)

## 📝 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- Built with Chrome Manifest V3
- Inspired by freedom from social media distractions
- Designed for focus and productivity

## 💬 Support

- **Issues**: Check server logs or Chrome DevTools console
- **Backend connection**: Test `/health` endpoint
- **WebSocket**: Ensure hosting supports WebSocket
- **Questions**: See documentation files above

---

**Stay focused. Stay productive. Use LocusFocus.** 🎯
