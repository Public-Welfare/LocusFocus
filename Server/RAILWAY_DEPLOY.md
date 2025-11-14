# 🚂 Deploy to Railway - Quick Guide

## Step 1: Prepare Your Code

Push your code to GitHub:

```bash
cd "c:\Users\atana\OneDrive\Desktop\WebD\Projects\Social shield"
git init
git add .
git commit -m "Initial commit - LocusFocus backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/locusfocus.git
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to Server folder
cd Server

# Initialize Railway project
railway init

# Add environment variables
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set NODE_ENV=production
railway variables set DATABASE_PATH=/app/data/locusfocus.db
railway variables set PORT=3000

# Add volume for database persistence
railway volume create data --mount /app/data

# Deploy
railway up

# Get your URL
railway domain
```

### Option B: Railway Dashboard

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **New Project** → "Deploy from GitHub repo"

3. **Select your repository**

4. **Configure**:
   - Root Directory: `Server`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Add Environment Variables**:
   - Click "Variables" tab
   - Add:
     ```
     JWT_SECRET = (click generate)
     NODE_ENV = production
     DATABASE_PATH = /app/data/locusfocus.db
     PORT = 3000
     ```

6. **Add Volume** (IMPORTANT for database):
   - Click "Data" tab
   - Click "New Volume"
   - Mount Path: `/app/data`
   - Size: 1 GB
   - Create

7. **Generate Domain**:
   - Click "Settings" → "Networking"
   - Click "Generate Domain"
   - Your URL: `https://locusfocus-backend.up.railway.app`

8. **Deploy**: Railway auto-deploys on commit

## Step 3: Test Deployment

```bash
# Test health endpoint
curl https://YOUR-APP.up.railway.app/health

# Should return: {"status":"ok","timestamp":...}
```

## Step 4: Update Extension

Your Railway URL is now: `https://YOUR-APP.up.railway.app`

**Update `options.js`**:
```javascript
const DEFAULT_BACKEND_URL = 'https://YOUR-APP.up.railway.app';
```

Or users can manually enter it in extension options.

## Railway Features

✅ **Free Tier**: 500 hours/month + $5 credit  
✅ **Auto HTTPS**: Automatic SSL certificates  
✅ **Auto Deploy**: Deploys on git push  
✅ **WebSocket**: Fully supported  
✅ **Volumes**: Persistent database storage  
✅ **Logs**: Real-time logs in dashboard  

## Monitoring

View logs:
```bash
railway logs
```

Or in Railway dashboard → "Deployments" → Click deployment → "View Logs"

## Updating

Push changes to GitHub:
```bash
git add .
git commit -m "Update backend"
git push
```

Railway auto-deploys! 🚀

## Troubleshooting

**Deployment fails:**
- Check logs in Railway dashboard
- Verify `package.json` exists in Server folder
- Check Node.js version compatibility

**Database resets on deploy:**
- Ensure volume is mounted at `/app/data`
- Check `DATABASE_PATH` env variable

**Can't connect:**
- Check domain is generated
- Test `/health` endpoint
- Verify CORS enabled (it is by default)

## Cost Estimate

- **Development**: Free (with $5 credit)
- **Production**: ~$5-10/month after free credit
- **Alternative**: Use Render (has permanent free tier)

---

**You're live on Railway! 🎉**

Share your backend URL with friends and start using Group Lock!
