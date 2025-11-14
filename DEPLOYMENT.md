# LocusFocus - Complete Deployment Guide

## 🚀 Complete Setup: Backend + Extension

This guide covers deploying your backend server and using it with the Chrome extension.

---

## Part 1: Deploy Backend Server

Choose one deployment method:

### Option A: Deploy to Render (Recommended - Free Tier)

1. **Sign up at [Render](https://render.com)**

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repo or use "Public Git repository"
   - Repository: Your GitHub repo URL

3. **Configure Service**
   - Name: `locusfocus-backend`
   - Region: Choose closest to you
   - Branch: `main`
   - Root Directory: `Server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Add Environment Variables**
   ```
   JWT_SECRET=your-super-secret-random-string-here
   NODE_ENV=production
   DATABASE_PATH=/var/data/locusfocus.db
   ```

5. **Create Disk Storage (Important for database persistence)**
   - Go to "Disks" tab
   - Add disk: `/var/data` with 1GB
   - This preserves your database between deployments

6. **Deploy**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - Your URL will be: `https://locusfocus-backend.onrender.com`

7. **Test Connection**
   ```bash
   curl https://locusfocus-backend.onrender.com/health
   ```
   Should return: `{"status":"ok","timestamp":...}`

---

### Option B: Deploy to Railway (Free Tier)

1. **Sign up at [Railway](https://railway.app)**

2. **Deploy from GitHub**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Select the `Server` directory as root

3. **Add Environment Variables**
   - Go to "Variables" tab
   ```
   PORT=3000
   JWT_SECRET=your-super-secret-random-string-here
   NODE_ENV=production
   DATABASE_PATH=/app/data/locusfocus.db
   ```

4. **Add Volume for Database**
   - Go to "Data" tab
   - Add volume mounted at `/app/data`

5. **Generate Domain**
   - Go to "Settings" → "Generate Domain"
   - Your URL: `https://locusfocus-backend.up.railway.app`

---

### Option C: Deploy to Your Own VPS

```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install git

# Clone repository
git clone https://github.com/yourusername/social-shield.git
cd social-shield/Server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3000
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
DATABASE_PATH=./locusfocus.db
EOF

# Install PM2 for process management
sudo npm install -g pm2

# Start server
pm2 start server.js --name locusfocus-backend
pm2 startup
pm2 save

# Install Nginx (optional - for domain and SSL)
sudo apt install nginx certbot python3-certbot-nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/locusfocus
```

Nginx config:
```nginx
server {
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/locusfocus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### Option D: Local Development

```bash
cd Server
npm install
cp .env.example .env
npm start
```

Your server runs at `http://localhost:3000`

---

## Part 2: Configure Chrome Extension

### 1. Install Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `social-shield-v67` folder

### 2. Configure Backend

1. Click the LocusFocus extension icon
2. Click "Open LocusFocus" → Click the gear icon for options
3. Scroll to "Backend Server" section

**For Render/Railway:**
```
Backend URL: https://your-app-name.onrender.com
```
or
```
Backend URL: https://locusfocus-backend.up.railway.app
```

**For Local:**
```
Backend URL: http://localhost:3000
```

4. Check "Enable Backend"
5. Click "Test connection" - should show "Backend connected ✅"
6. Click "Save"

### 3. Set Up Mutual Lock

1. In the "Mutual Lock" section:
   - **Your ID**: Enter your name (e.g., "Alice")
   - **Room Code**: Enter a shared room code (e.g., "team-focus-2024")
   - Check "Enable Mutual Lock"

2. Share the **Room Code** with your partner

3. Your partner should:
   - Install the extension
   - Use the **same Backend URL**
   - Use the **same Room Code**
   - Use a **different User ID** (e.g., "Bob")

---

## Part 3: Using Mutual Lock

### Lock Yourself
1. Click extension icon → "Lock Me"
2. You're now locked (cannot unlock yourself)

### Lock Your Partner
1. In popup, click "Lock Partner"
2. Your partner will receive notification and be locked

### Unlock Your Partner
1. Click extension icon
2. Click "Unlock Partner"
3. They can now access blocked sites

### Ultra Lock (Self-Lock with Timer)
1. Click extension icon
2. Enter minutes (e.g., 30)
3. Click "Start Ultra Lock"
4. **Cannot be cancelled** until timer expires
5. Sites automatically unblock when timer ends

---

## Part 4: Verify Everything Works

### Test Backend
```bash
curl https://your-backend-url.com/health
```
Should return: `{"status":"ok","timestamp":...}`

### Test WebSocket
```bash
# In browser console on extension popup:
const ws = new WebSocket('wss://your-backend-url.com');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

### Test Mutual Lock
1. Open extension on both devices (you + partner)
2. Person A clicks "Lock Me"
3. Person A should be blocked from social sites
4. Person B clicks "Unlock Partner"
5. Person A should now have access

---

## 🎯 Quick Checklist

Backend Deployment:
- [ ] Backend deployed to Render/Railway/VPS
- [ ] Database storage configured (persistent disk/volume)
- [ ] Environment variables set (JWT_SECRET, NODE_ENV)
- [ ] Health check returns OK (`/health` endpoint)
- [ ] HTTPS enabled (automatic on Render/Railway)

Extension Setup:
- [ ] Extension loaded in Chrome
- [ ] Backend URL configured in options
- [ ] "Test connection" shows success
- [ ] Mutual Lock enabled with User ID and Room Code
- [ ] Partner has same Room Code, different User ID

Testing:
- [ ] Can toggle blocking on/off
- [ ] Ultra Lock works and can't be cancelled
- [ ] Partner can lock you
- [ ] Partner can unlock you
- [ ] Notifications appear for lock/unlock events

---

## 🔧 Troubleshooting

### "Backend connection failed"
- Check server is running: Visit `https://your-backend/health`
- Verify URL has no trailing slash
- Check CORS is enabled (it is by default)

### "WebSocket connection failed"
- Render/Railway: Ensure you're using `https://` (they auto-upgrade to `wss://`)
- VPS: Check firewall allows WebSocket connections
- Check Nginx config includes WebSocket headers

### Partner can't connect to same room
- Verify both using **exact same** Backend URL
- Verify both using **exact same** Room Code
- Verify **different** User IDs
- Check both have "Enable Backend" checked

### "Database locked" errors
- Render/Railway: Ensure persistent disk/volume configured
- High traffic: Consider migrating to PostgreSQL

### Sites still accessible when locked
- Check extension is enabled: `chrome://extensions/`
- Reload extension: Toggle off/on
- Check blocked sites list in options

---

## 📊 Hosting Comparison

| Provider | Cost | Setup Time | Database | SSL | WebSocket |
|----------|------|------------|----------|-----|-----------|
| Render | Free | 5 min | ✅ Disk | ✅ Auto | ✅ Yes |
| Railway | Free | 3 min | ✅ Volume | ✅ Auto | ✅ Yes |
| VPS | $5/mo | 15 min | ✅ Local | Manual | ✅ Yes |
| Local | Free | 2 min | ✅ Local | ❌ No | ✅ Yes |

**Recommendation**: Use **Render** for production (free, easy, SSL included)

---

## 🔒 Security Best Practices

1. **Change JWT_SECRET**: Use a long random string
   ```bash
   # Generate secure secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use HTTPS**: Required for production (auto on Render/Railway)

3. **Keep Room Codes Private**: Share only with trusted partners

4. **Regular Backups**: Download database backups periodically
   ```bash
   # On VPS:
   cp ./locusfocus.db ./backups/backup-$(date +%Y%m%d).db
   ```

5. **Monitor Usage**: Check server logs for unusual activity

---

## 📞 Support

If you encounter issues:

1. Check server logs (Render/Railway dashboard)
2. Test with `curl` commands above
3. Try with `http://localhost:3000` first
4. Check Chrome DevTools console for errors

---

## 🎉 You're All Set!

Your LocusFocus extension is now running on your own backend server - no Firebase needed!

Enjoy distraction-free productivity! 🚀
