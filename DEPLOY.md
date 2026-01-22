# KRMU Green - Netlify Deployment Guide

## Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/krmu-green)

## Prerequisites

This project uses **Netlify Functions** for the magic link authentication. You'll need:
- A Netlify account
- Firebase project (for authentication)
- Resend account (for sending emails)

## Setup Steps

### 1. Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Netlify will auto-detect the config from `netlify.toml`

### 2. Add Environment Variables

In **Netlify Dashboard** → **Site settings** → **Environment variables**, add:

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key for emails | ✅ |
| `EMAIL_FROM` | Sender email address | ✅ |
| `APP_URL` | Your site URL (e.g., `https://your-site.netlify.app`) | ✅ |
| `FRONTEND_URL` | Same as APP_URL | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | ✅ |
| `FIREBASE_PRIVATE_KEY` | Firebase private key (with `\n` for newlines) | ✅ |

### 3. Firebase Setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → **Sign-in method** → **Email/Password**
3. Toggle **"Email link (passwordless sign-in)"** ON
4. Go to **Settings** → **Authorized domains** and add your Netlify URL
5. Go to **Project Settings** → **Service Accounts**
6. Click **Generate New Private Key**
7. Copy the values to Netlify environment variables:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 4. Resend Setup

1. Create account at [resend.com](https://resend.com)
2. Get API Key from **API Keys** tab
3. (Production) Verify your domain in **Domains** tab
4. Set `EMAIL_FROM` to an address from your verified domain

> [!NOTE]
> For Resend free tier, you can only send to your own email unless you verify a domain.

### 5. Deploy

Click **Deploy** in Netlify dashboard. The site will build and deploy automatically.

## Architecture

```
krmu-green/
├── client/              # Static frontend (served at root)
│   ├── index.html       # Sign-in page (magic link)
│   ├── finish-signin.html # Complete sign-in
│   ├── dashboard.html   # User dashboard
│   └── ...
├── netlify/
│   └── functions/
│       └── send-link.js # Serverless function for auth
├── netlify.toml         # Netlify configuration
└── package.json
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/send-link` | POST | Send magic link email |
| `/*` | GET | Static files from `/client` |

## Authentication Flow

1. User enters roll number on sign-in page
2. Backend generates Firebase sign-in link
3. Link is sent via Resend email API
4. User clicks link → redirected to `/finish-signin.html`
5. Firebase completes authentication
6. User redirected to dashboard

## Local Development

```bash
# Install dependencies
npm install

# Install Netlify CLI globally (if needed)
npm install -g netlify-cli

# Start local dev server with functions
netlify dev

# Visit http://localhost:8888
```

## Troubleshooting

### Emails not sending?
- Check `RESEND_API_KEY` is set correctly
- Verify sender domain in Resend (for production)
- Check Netlify function logs for errors

### Sign-in link not working?
- Ensure your domain is in Firebase Authorized Domains
- Check `APP_URL` matches your actual site URL
- Verify Firebase config in `js/firebase-init.js`

### Build errors?
- Check Netlify deploy logs
- Ensure all dependencies are in `package.json`
