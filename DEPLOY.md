# Deployment Guide

Complete deployment instructions for Inventory POS System.

---

## Quick Start Options

### 1. Local Development (Docker Compose)
```bash
./deploy.sh local
```
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### 2. Production (Docker + Nginx + SSL)
```bash
# 1. Configure .env with production values
cp .env.example .env
# Edit .env with your secrets

# 2. Add SSL certificates to ./ssl/
# 3. Deploy
./deploy.sh production
```

### 3. Railway (Backend) + Netlify (Frontend) - Recommended
```bash
./deploy.sh railway
```
Pushes to GitHub → GitHub Actions deploys automatically.

---

## Detailed Setup

### Option A: Railway + Netlify (Free Tier Friendly)

#### 1. Prerequisites
- GitHub account
- Railway account (railway.app)
- Netlify account (netlify.app)

#### 2. Backend → Railway

**Step 1: Create Railway Project**
1. Go to [railway.app](https://railway.app) → New Project
2. Select "Deploy from GitHub repo"
3. Choose your `inventory-system` repo
4. **Root Directory**: `backend` ⚠️ Important!

**Step 2: Configure Variables**
In Railway Dashboard → Variables, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `COOKIE_SECRET` | `openssl rand -base64 32` |
| `FRONTEND_URL` | `https://your-frontend.netlify.app` |
| `PORT` | `3001` |

**Step 3: Deploy**
Railway auto-deploys on push to main. Copy the generated URL: `https://xxx.up.railway.app`

#### 3. Frontend → Netlify

**Step 1: Create Netlify Site**
1. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
2. Select repo → **Base directory**: `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`

**Step 2: Configure Variables**
In Netlify Dashboard → Site settings → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.railway.app/api` |

**Step 3: Deploy**
Netlify builds and deploys. Copy URL: `https://your-site.netlify.app`

#### 4. Connect Both
- Update Railway `FRONTEND_URL` = Netlify URL
- Update Netlify `VITE_API_URL` = Railway URL
- Trigger redeploy on both platforms

---

### Option B: Self-Hosted (VPS/Dedicated)

#### 1. Server Requirements
- Ubuntu 22.04+ / Debian 12+
- 2GB RAM minimum (4GB recommended)
- 20GB disk space
- Docker + Docker Compose installed

#### 2. Setup
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# Clone repo
git clone https://github.com/youruser/inventory-system.git
cd inventory-system

# Configure environment
cp .env.example .env
# Edit .env with production values

# Generate SSL (Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
# Copy certs to ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*
```

#### 3. Deploy
```bash
./deploy.sh production
```

#### 4. Auto-renew SSL
```bash
# Add to crontab
0 0 * * * /usr/bin/certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /path/to/inventory-system/ssl/ && docker-compose --profile production restart nginx
```

---

## Environment Variables Reference

### Backend (`.env`)
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-64-char-secret
COOKIE_SECRET=your-64-char-secret
FRONTEND_URL=https://your-frontend.netlify.app
# Optional:
# DATABASE_URL=postgresql://...
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=...
# SMTP_PASS=...
```

### Frontend (Netlify Dashboard)
```env
VITE_API_URL=https://your-backend.railway.app/api
```

---

## GitHub Actions CI/CD

The `.github/workflows/deploy.yml` handles:

1. **Backend** → Railway on push to main
2. **Frontend** → Netlify on push to main
3. **TypeScript check** on every PR

### Required Secrets

**GitHub Settings → Secrets → Actions:**

| Secret | Value |
|--------|-------|
| `RAILWAY_TOKEN` | From Railway Account → Tokens |
| `RAILWAY_SERVICE_ID` | From Railway Project → Settings |
| `NETLIFY_AUTH_TOKEN` | From Netlify User Settings → Applications |
| `NETLIFY_SITE_ID` | From Netlify Site Settings → General |

---

## Manual Commands

```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build

# Run backend locally
cd backend && npm run dev

# Run frontend locally
cd frontend && npm run dev

# View logs
./deploy.sh logs backend
./deploy.sh logs frontend

# Check status
./deploy.sh status

# Stop all
./deploy.sh stop

# Clean everything
./deploy.sh clean
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `EADDRINUSE` port 3001 | `docker-compose down` or `kill $(lsof -t -i:3001)` |
| CORS errors | Verify `FRONTEND_URL` matches exactly (protocol + domain) |
| 401 Unauthorized | Check `JWT_SECRET` matches; clear browser localStorage |
| WebSocket fails | Ensure nginx config has upgrade headers; Railway supports WS natively |
| Build fails | Check Node version (20+); run `npm ci` locally first |
| Variables not loaded | Restart deploy after adding env vars |

---

## Monitoring

### Health Checks
```bash
# Backend
curl https://your-backend.railway.app/health

# Frontend
curl https://your-frontend.netlify.app/health
```

### Logs
```bash
# Railway
railway logs

# Netlify
netlify logs

# Local Docker
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Security Checklist

- [ ] Generate new `JWT_SECRET` and `COOKIE_SECRET` for production
- [ ] Use HTTPS everywhere (Let's Encrypt or Cloudflare)
- [ ] Restrict CORS to exact frontend domain
- [ ] Enable rate limiting (configured in nginx)
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Rotate secrets periodically
- [ ] Monitor failed login attempts

---

## Support

For issues:
1. Check logs: `./deploy.sh logs`
2. Verify environment variables
3. Ensure all services are healthy
4. Check GitHub Actions for CI/CD failures