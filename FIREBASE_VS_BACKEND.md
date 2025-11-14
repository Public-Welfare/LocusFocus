# Firebase vs Custom Backend Comparison

## Overview

LocusFocus now supports **two backend options**:

1. **Firebase** (Original) - Google's cloud platform
2. **Custom Backend** (New) - Self-hosted Node.js server

---

## Feature Comparison

| Feature | Firebase | Custom Backend |
|---------|----------|----------------|
| **Cost** | Free tier (limited) | Free (self-hosted) or ~$5/mo VPS |
| **Setup Time** | 10 minutes | 5 minutes |
| **Hosting** | Google Cloud | Render/Railway/VPS |
| **Database** | Firestore | SQLite (upgradable to PostgreSQL) |
| **Real-time Sync** | ✅ Native | ✅ WebSocket |
| **Scalability** | High | Medium (upgradable) |
| **Data Control** | Google servers | Your server |
| **Privacy** | Data on Google | Full control |
| **Configuration** | Complex (API keys, Firestore rules) | Simple (just URL) |
| **Offline Support** | ✅ Yes | ❌ No (requires connection) |
| **Custom Features** | Limited | ✅ Full control |

---

## When to Use Each

### Use Firebase if:
- You want Google's infrastructure
- You need offline support
- You expect very high traffic (1000+ users)
- You don't want to manage servers
- You're okay with data on Google's servers

### Use Custom Backend if:
- You want full data control
- You prefer self-hosting
- You want simpler setup (no Firebase console)
- You want to customize the backend
- You value privacy (data stays on your server)
- You want to learn backend development

---

## Migration Guide

### From Firebase to Custom Backend

1. **Deploy Custom Backend**
   - Follow [DEPLOYMENT.md](DEPLOYMENT.md)
   - Get your backend URL

2. **Update Extension**
   - Go to Options
   - Uncheck old Firebase settings
   - Enter Backend URL
   - Enable Backend
   - Same Room Code and User ID work!

3. **Notify Partners**
   - Share new backend URL
   - They update their extension too

### From Custom Backend to Firebase

1. **Set up Firebase**
   - Create Firebase project
   - Enable Firestore
   - Get configuration

2. **Update Extension**
   - Go to Options
   - Enter Firebase config
   - Disable Custom Backend
   - Enable Firebase

---

## Technical Differences

### Firebase
```javascript
// Firebase SDK (loaded from CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';

// Real-time listener
onSnapshot(doc(db, 'rooms', roomId), (snap) => {
  // Handle update
});
```

### Custom Backend
```javascript
// REST API + WebSocket
const api = new LocusFocusAPI('https://your-backend.com');
await api.joinRoom(roomId, userId, username);

// Real-time listener
api.onSnapshot((data) => {
  // Handle update
});
```

---

## Performance

### Firebase
- **Latency**: ~100-300ms (Google infrastructure)
- **Concurrent Users**: Unlimited (scales automatically)
- **Cost**: Free tier: 50k reads, 20k writes/day
- **Paid**: Pay per operation

### Custom Backend
- **Latency**: ~50-200ms (depends on hosting)
- **Concurrent Users**: ~100-500 (SQLite), unlimited (PostgreSQL)
- **Cost**: Free (Render/Railway) or $5-20/mo (VPS)
- **Scaling**: Manual (upgrade server or switch to PostgreSQL)

---

## Security

### Firebase
- ✅ Built-in authentication
- ✅ Security rules (Firestore)
- ✅ SSL/HTTPS automatic
- ❌ Data on Google servers
- ❌ Complex security rule syntax

### Custom Backend
- ✅ Full control over data
- ✅ SSL/HTTPS (on Render/Railway)
- ✅ Simple room-based access
- ❌ No built-in auth (add if needed)
- ✅ Data stays on your server

---

## Recommendation

**For most users**: Use **Custom Backend**
- ✅ Simpler setup
- ✅ Free hosting (Render/Railway)
- ✅ Full data control
- ✅ Easier to understand

**For enterprise/high-scale**: Use **Firebase**
- ✅ Auto-scaling
- ✅ Offline support
- ✅ Google infrastructure
- ✅ Advanced features

---

## Code Changes Required

### Extension Files Changed

Firebase version (old):
- `firebase.js` - Firebase SDK loader
- `service_worker.js` - Uses Firebase Firestore
- `options.js` - Firebase configuration UI

Custom Backend version (new):
- `backend-api.js` - REST + WebSocket client
- `service_worker.js` - Uses LocusFocusAPI
- `options.js` - Backend URL configuration UI

### Both Supported

The extension **supports both** backends!

Switch by:
1. Going to Options
2. Disabling one, enabling the other
3. Saving

---

## Backend Code

### Firebase (Firestore Rules)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /socialShieldRooms/{roomId} {
      allow read, write: if true; // Open access
    }
  }
}
```

### Custom Backend (Express Routes)
```javascript
app.post('/api/rooms/:roomId/lock', (req, res) => {
  const { targetUserId, lockedByUserId, locked } = req.body;
  setLock(roomId, targetUserId, lockedByUserId, locked);
  broadcastToRoom(roomId, { type: 'lock_changed', ... });
  res.json({ success: true });
});
```

---

## FAQ

**Q: Can I use both at the same time?**
A: No, choose one. They don't sync with each other.

**Q: Is my data lost when switching?**
A: Lock state is local to your extension. Room data is separate on each backend.

**Q: Which is more private?**
A: Custom Backend - data stays on your server, not Google's.

**Q: Which is easier?**
A: Custom Backend - just enter URL, no Firebase console needed.

**Q: Which is faster?**
A: Similar speeds, depends on hosting location.

**Q: Can I run backend on Raspberry Pi?**
A: Yes! Custom Backend runs anywhere Node.js runs.

---

## Support

**Firebase issues**: Check Firebase console, Firestore rules
**Custom Backend issues**: Check server logs, test `/health` endpoint

Both methods are fully supported! Choose what works best for you.
