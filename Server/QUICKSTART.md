# 🚀 Quick Start Guide

## Local Development (2 minutes)

### 1. Start Backend Server

```bash
cd Server
npm install
npm start
```

Server runs at `http://localhost:3000`

### 2. Configure Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `social-shield-v67` folder
4. Click LocusFocus icon → Options
5. Backend URL: `http://localhost:3000`
6. Enable Backend → Test connection → Save

### 3. Test It

- Enter User ID: "Alice"
- Enter Room Code: "test-room"
- Enable Mutual Lock
- Click "Lock Me" in popup
- Social media sites are now blocked!

---

## Production Deployment (5 minutes)

### Deploy to Render (Free)

1. Go to [render.com](https://render.com) → Sign up
2. New Web Service → Connect GitHub repo
3. Configure:
   - Root Directory: `Server`
   - Build: `npm install`
   - Start: `npm start`
4. Add env variable: `JWT_SECRET=your-random-secret-here`
5. Add disk at `/var/data` (1GB)
6. Deploy!

Your URL: `https://your-app.onrender.com`

### Update Extension

1. Extension options → Backend URL: `https://your-app.onrender.com`
2. Test connection → Save
3. Share Room Code with partner!

---

## Commands Reference

```bash
# Install dependencies
npm install

# Run development server (auto-reload)
npm run dev

# Run production server
npm start

# Test backend
curl http://localhost:3000/health

# Clean old rooms (30+ days inactive)
curl -X POST http://localhost:3000/api/admin/cleanup
```

---

## Extension Features

- **Toggle Block**: Turn blocking on/off
- **Ultra Lock**: Self-lock with timer (cannot cancel)
- **Mutual Lock**: Partner accountability
- **Custom Domains**: Add your own blocked sites
- **Dark Mode**: Light/dark theme toggle

---

For detailed deployment options, see [DEPLOYMENT.md](DEPLOYMENT.md)
