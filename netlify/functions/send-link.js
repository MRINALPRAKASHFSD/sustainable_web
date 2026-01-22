const { z } = require('zod');
const { Resend } = require('resend');
const admin = require('firebase-admin');

// Initialize Firebase Admin (singleton)
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                })
            });
        }
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (e) {
        console.error('Firebase init error:', e.message);
    }
}

// Initialize Resend lazily
let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
}

// Email validation schema
const emailSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .refine(
            (email) => email.endsWith('@krmu.edu.in'),
            { message: 'Must be a valid KRMU email address' }
        )
});

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 5;
const MIN_REQUEST_INTERVAL_MS = 30 * 1000;

function checkRateLimit(email) {
    const now = Date.now();
    const key = email.toLowerCase();

    if (!rateLimitMap.has(key)) {
        rateLimitMap.set(key, { count: 0, firstRequest: now, lastRequest: 0 });
    }

    const record = rateLimitMap.get(key);

    if (now - record.firstRequest > RATE_LIMIT_WINDOW_MS) {
        record.count = 0;
        record.firstRequest = now;
    }

    if (record.lastRequest && now - record.lastRequest < MIN_REQUEST_INTERVAL_MS) {
        const waitSeconds = Math.ceil((MIN_REQUEST_INTERVAL_MS - (now - record.lastRequest)) / 1000);
        return { allowed: false, message: `Please wait ${waitSeconds} seconds before requesting again` };
    }

    if (record.count >= MAX_REQUESTS_PER_HOUR) {
        return { allowed: false, message: 'Too many requests. Please try again later.' };
    }

    record.count++;
    record.lastRequest = now;

    return { allowed: true };
}

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Credentials': 'true'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Credentials': 'true'
    };

    try {
        const body = JSON.parse(event.body || '{}');

        // Validate email
        const validation = emailSchema.safeParse(body);

        if (!validation.success) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'If eligible, you will receive a sign-in link' })
            };
        }

        const { email } = validation.data;

        // Check rate limit
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ success: false, message: rateCheck.message })
            };
        }

        // Check Firebase is initialized
        if (!admin.apps.length) {
            console.error('Firebase Admin not initialized');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'If eligible, you will receive a sign-in link' })
            };
        }

        // Check Resend
        if (!resend) {
            console.error('Resend not initialized');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'If eligible, you will receive a sign-in link' })
            };
        }

        // Action code settings
        const actionCodeSettings = {
            url: `${process.env.APP_URL}/finish-signin.html`,
            handleCodeInApp: true
        };

        // Generate Firebase email sign-in link
        const signInLink = await admin.auth().generateSignInWithEmailLink(
            email,
            actionCodeSettings
        );

        // Send email via Resend
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'KRMU Green <noreply@resend.dev>',
            to: email,
            subject: 'Sign in to KRMU Green',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td style="background: linear-gradient(135deg, #0a0a0c 0%, #1a1a1f 100%); border-radius: 16px; padding: 40px;">
                <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">
                    KRMU <span style="color: #22c55e;">GREEN</span>
                </h1>
                <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 14px;">
                    Student Environmental Initiative
                </p>
                <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
                    Sign in to your account
                </h2>
                <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 14px; line-height: 1.6;">
                    Click the button below to securely sign in. This link expires in 1 hour.
                </p>
                <a href="${signInLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                          color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                          font-weight: 600; font-size: 14px; margin-bottom: 24px;">
                    Sign in to KRMU Green
                </a>
                <p style="color: #71717a; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
                    If you didn't request this email, you can safely ignore it. 
                    This link can only be used once.
                </p>
            </td>
        </tr>
        <tr>
            <td style="text-align: center; padding: 24px 0;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} KRMU Green. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'If eligible, you will receive a sign-in link' })
        };

    } catch (error) {
        console.error('Send link error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'If eligible, you will receive a sign-in link' })
        };
    }
};
