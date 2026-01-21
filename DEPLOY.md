# KRMU Green - Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/krmu-green)

## Manual Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

### 3. Configure Environment Variables
In Vercel Dashboard > **Settings** > **Environment Variables**, add:

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `your-random-32-char-string` |
| `OTP_SECRET` | Secret for OTP hashing | `another-random-string` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | `your-email@gmail.com` |
| `SMTP_PASS` | Email app password | `your-app-password` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase credentials (JSON) | `{"type":"service_account",...}` |
| `FRONTEND_URL` | Your Vercel URL | `https://krmu-green.vercel.app` |

### 4. Deploy
Click **Deploy** - Vercel will build and deploy automatically.

## Project Structure (Vercel)

```
/
├── api/                 # Serverless functions
│   ├── auth.js         # Authentication endpoints
│   ├── stats.js        # Statistics endpoints
│   └── health.js       # Health check
├── client/             # Static frontend (served at root)
│   ├── index.html
│   ├── login.html
│   └── ...
├── vercel.json         # Vercel configuration
└── package.json
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/request-otp` | POST | Request OTP for login/register |
| `/auth/verify-otp` | POST | Verify OTP and authenticate |
| `/auth/me` | GET | Get current user info |
| `/auth/logout` | POST | Logout user |
| `/stats/summary` | GET | Get stats summary (auth required) |
| `/stats/activity` | GET | Get recent activity (auth required) |
| `/health` | GET | Health check |

## Important Notes

### Database
The serverless functions use in-memory storage by default. For production with persistent data:

1. **Vercel KV** (Redis) - Recommended for session/OTP storage
2. **Vercel Postgres** - For persistent student data
3. **PlanetScale** / **Neon** - MySQL/PostgreSQL alternatives

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Go to Project Settings > Service Accounts
3. Generate new private key
4. Copy the entire JSON and paste as `FIREBASE_SERVICE_ACCOUNT` env variable

### Gmail SMTP
1. Enable 2FA on your Google account
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use that password for `SMTP_PASS`

## Local Development

The original Express server in `/server` still works for local development:

```bash
# Install dependencies
npm run install-all

# Start dev server
npm run dev
```

Visit `http://localhost:3000`
