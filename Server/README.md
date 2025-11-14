# LocusFocus Backend Server

A Node.js backend server to replace Firebase for the LocusFocus Chrome extension.

## Features

- ✅ **No Firebase required** - Self-hosted backend
- 🔄 **Real-time updates** - WebSocket support for mutual lock synchronization
- 💾 **SQLite database** - Lightweight and portable
- 🚀 **Easy deployment** - Deploy to Render, Railway, or any VPS
- 🔒 **Secure** - Room-based access control

## Quick Start

### 1. Install Dependencies

```bash
cd Server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` if needed:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
DATABASE_PATH=./locusfocus.db
```

### 3. Run the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 4. Configure Extension

1. Open the extension options page
2. Enter backend URL: `http://localhost:3000`
3. Enable Backend
4. Set up Mutual Lock with your User ID and Room Code
5. Share the Room Code with your partner

## API Endpoints

### Health Check
```
GET /health
```

### Join Room
```
POST /api/rooms/:roomId/join
Body: { userId: "alice", username: "Alice" }
```

### Get Room State
```
GET /api/rooms/:roomId
```

### Set Lock
```
POST /api/rooms/:roomId/lock
Body: { targetUserId: "alice", lockedByUserId: "bob", locked: true }
```

### Get Lock Status
```
GET /api/rooms/:roomId/locks/:userId
```

## Deployment

### Deploy to Render (Free)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables from `.env`
6. Deploy!

Your backend URL will be: `https://your-app-name.onrender.com`

### Deploy to Railway (Free)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`
5. Add environment variables: `railway variables`

### Deploy to VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd Server
npm install

# Install PM2 for process management
sudo npm install -g pm2

# Start server
pm2 start server.js --name locusfocus-backend
pm2 startup
pm2 save

# Setup Nginx reverse proxy (optional)
sudo apt install nginx
```

Nginx config (`/etc/nginx/sites-available/locusfocus`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Deploy with Docker

```bash
# Build image
docker build -t locusfocus-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  -e PORT=3000 \
  -e JWT_SECRET=your-secret \
  --name locusfocus \
  locusfocus-backend
```

## Database

The server uses SQLite for simplicity. The database file is created automatically at `./locusfocus.db`

### Tables

- `rooms` - Store room metadata
- `room_users` - Track users in each room
- `locks` - Store lock status for each user

### Cleanup

Remove inactive rooms (older than 30 days):

```bash
curl -X POST http://localhost:3000/api/admin/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 30}'
```

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production (Render/Railway provide this automatically)
- Consider adding authentication for admin endpoints
- SQLite works for small-medium deployments (< 1000 concurrent users)
- For larger deployments, migrate to PostgreSQL or MySQL

## Troubleshooting

### Extension can't connect to backend

1. Check server is running: `curl http://localhost:3000/health`
2. Check CORS is enabled (it is by default)
3. Verify backend URL in extension options

### WebSocket connection fails

1. Ensure your hosting provider supports WebSocket
2. Check firewall/proxy settings
3. Use `wss://` for HTTPS deployments

### Database locked errors

SQLite can have concurrency issues. If you see "database locked" errors:
- The server uses WAL mode to improve concurrency
- Consider migrating to PostgreSQL for high traffic

## Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Set up monitoring (PM2, uptime monitors)
- [ ] Configure backups for database file
- [ ] Set up log rotation
- [ ] Test WebSocket connections
- [ ] Update extension with production backend URL

## License

MIT
