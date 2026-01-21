# KRMU Green - Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/krmu-green)

## Prerequisites

This project uses **Vercel Postgres** for data persistence. You'll need:
- A Vercel account
- Vercel Postgres connected to your project

## Setup Steps

### 1. Create Vercel Postgres Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Name it `krmu-green`
6. Click **Create and Connect**

This automatically adds `POSTGRES_URL` environment variable.

### 2. Run Database Migrations

After creating Postgres, run the migration script:

```bash
# Install dependencies
npm install

# Run migration (creates tables)
node scripts/migrate.js
```

This creates:
- `students` table - for user accounts
- `otp_requests` table - for OTP storage

### 3. Push to GitHub

```bash
git add .
git commit -m "Setup Vercel Postgres integration"
git push origin main
```

### 4. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select **Import Git Repository**
3. Paste your GitHub repo URL
4. Click **Import**
5. Vercel will auto-detect the config

### 5. Add Environment Variables

In **Vercel Dashboard** → **Settings** → **Environment Variables**, add:

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `JWT_SECRET` | Random secret for JWT | Generate: `openssl rand -base64 32` |
| `OTP_SECRET` | Random secret for OTP hashing | Generate: `openssl rand -base64 32` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` for Gmail |
| `SMTP_PORT` | Email port | `587` for Gmail |
| `SMTP_USER` | Your email | `your-email@gmail.com` |
| `SMTP_PASS` | App password | See Firebase setup below |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase credentials JSON | See Firebase setup below |
| `FRONTEND_URL` | Your deployment URL | `https://your-project.vercel.app` |
| `POSTGRES_URL` | Database URL | Added automatically by Vercel |
| `NODE_ENV` | Environment | `production` |

### 6. Deploy

Click **Deploy** and Vercel will:
- Build the project
- Set up the API functions
- Serve static files from `/client`

## Firebase Setup (Optional)

Firebase is used for authentication tokens. To enable:

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Go to **Project Settings** → **Service Accounts**
3. Click **Generate New Private Key**
4. Copy the entire JSON
5. Paste as `FIREBASE_SERVICE_ACCOUNT` in Vercel (as single line)

## Gmail SMTP Setup

To send OTP emails via Gmail:

1. Enable 2FA on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select **Mail** and **Windows Computer**
4. Copy the generated password
5. Use as `SMTP_PASS` in Vercel

## Troubleshooting

### Still getting 404?
- Check **Deployments** tab in Vercel for build errors
- Verify `vercel.json` is in root directory
- Check that `client/` folder has HTML files

### Database connection errors?
- Verify `POSTGRES_URL` environment variable exists
- Run migration script: `node scripts/migrate.js`
- Check Postgres is connected in Vercel Storage tab

### OTP emails not sending?
- Verify SMTP credentials are correct
- Check Gmail app password (not regular password)
- Check email logs: `curl https://your-project.vercel.app/health`

## Database Schema

### students table
```sql
- id (PRIMARY KEY)
- roll_number (UNIQUE)
- email (UNIQUE)
- name
- phone
- created_at (TIMESTAMP)
```

### otp_requests table
```sql
- id (PRIMARY KEY)
- email
- purpose ('register' or 'login')
- otp_hash
- expires_at (TIMESTAMP)
- used_at (TIMESTAMP, NULL if unused)
- attempts
- ip
- created_at (TIMESTAMP)
```

## API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/request-otp` | POST | ❌ | Request OTP for login/register |
| `/auth/verify-otp` | POST | ❌ | Verify OTP and authenticate |
| `/auth/me` | GET | ✅ | Get current user info |
| `/auth/logout` | POST | ✅ | Logout user |
| `/stats/summary` | GET | ✅ | Get stats summary |
| `/stats/activity` | GET | ✅ | Get recent activity |
| `/health` | GET | ❌ | Health check |

## Local Development

For local development using the original Express server:

```bash
# Install dependencies
npm run install-all

# Start dev server
npm run dev

# Visit http://localhost:3000
```

Note: Local development won't have Vercel Postgres. Create a local PostgreSQL database or use SQLite.

## File Structure

```
/
├── api/
│   ├── auth.js         # Authentication endpoints
│   ├── stats.js        # Statistics endpoints
│   └── health.js       # Health check
├── client/             # Frontend (served at root)
│   ├── index.html
│   ├── login.html
│   └── ...
├── scripts/
│   └── migrate.js      # Database migration
├── server/             # Original Express server (local dev)
├── vercel.json         # Vercel configuration
└── package.json
```

## Next Steps

After deployment:
1. Test login/registration at `/login.html`
2. Check statistics at `/stats.html`
3. Monitor Vercel dashboard for errors
4. Set up custom domain in Vercel settings
