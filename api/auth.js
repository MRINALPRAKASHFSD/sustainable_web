import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

// Initialize Firebase Admin (singleton)
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.project_id) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
}

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// Helper functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp + process.env.OTP_SECRET).digest('hex');
}

function verifyOTP(otp, hash) {
    return hashOTP(otp) === hash;
}

function resolveEmail(identifier) {
    identifier = identifier.trim().toLowerCase();
    if (identifier.includes('@')) {
        if (!identifier.endsWith('@krmu.edu.in')) return null;
        return identifier;
    }
    if (!/^[a-z0-9]{5,15}$/i.test(identifier)) return null;
    return `${identifier}@krmu.edu.in`;
}

// Nodemailer setup
async function sendOTPEmail(email, otp, purpose) {
    // Dynamic import for nodemailer
    const nodemailer = await import('nodemailer');
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[DEV] OTP for ${email}: ${otp}`);
        return;
    }

    const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const purposeText = purpose === 'register' ? 'Registration' : 'Login';

    await transporter.sendMail({
        from: `"KRMU Green" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your KRMU Green ${purposeText} OTP`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #22c55e;">KRMU Green ${purposeText}</h2>
                <p>Your OTP is:</p>
                <div style="background: #f0fdf4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a;">${otp}</span>
                </div>
                <p style="color: #666;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    });
}

// Parse cookies from header
function parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = value;
        });
    }
    return cookies;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const path = req.url.replace('/api/auth', '').replace('/auth', '').split('?')[0];

    try {
        // POST /auth/request-otp
        if (path === '/request-otp' && req.method === 'POST') {
            const { identifier, purpose } = req.body;

            if (!identifier || !['register', 'login'].includes(purpose)) {
                return res.status(400).json({ success: false, message: 'Invalid request' });
            }

            const email = resolveEmail(identifier);
            if (!email) {
                return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
            }

            const student = await sql`SELECT id FROM students WHERE email = ${email}`;

            if (purpose === 'login' && student.rows.length === 0) {
                return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
            }
            if (purpose === 'register' && student.rows.length > 0) {
                return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
            }

            // Check rate limit
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const recentOTPs = await sql`
                SELECT COUNT(*) as count, MAX(created_at) as last_sent 
                FROM otp_requests 
                WHERE email = ${email} AND created_at > ${oneHourAgo}
            `;

            if (recentOTPs.rows[0].count >= 5) {
                return res.status(429).json({ success: false, message: 'Too many requests. Try again later.' });
            }

            if (recentOTPs.rows[0].last_sent) {
                const lastSent = new Date(recentOTPs.rows[0].last_sent).getTime();
                const diff = (Date.now() - lastSent) / 1000;
                if (diff < 30) {
                    return res.status(429).json({
                        success: false,
                        message: `Please wait ${Math.ceil(30 - diff)} seconds before requesting again`
                    });
                }
            }

            // Generate and store OTP
            const otp = generateOTP();
            const otpHash = hashOTP(otp);
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

            await sql`
                INSERT INTO otp_requests (email, purpose, otp_hash, expires_at, ip)
                VALUES (${email}, ${purpose}, ${otpHash}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.connection.remoteAddress})
            `;

            // Send email
            try {
                await sendOTPEmail(email, otp, purpose);
            } catch (emailError) {
                console.error('Email send failed:', emailError);
                console.log(`[DEV] OTP for ${email}: ${otp}`);
            }

            return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
        }

        // POST /auth/verify-otp
        if (path === '/verify-otp' && req.method === 'POST') {
            const { email, otp, purpose, payload } = req.body;

            if (!email || !otp || !['register', 'login'].includes(purpose)) {
                return res.status(400).json({ success: false, message: 'Invalid request' });
            }

            if (!/^\d{6}$/.test(otp)) {
                return res.status(400).json({ success: false, message: 'Invalid OTP format' });
            }

            // Find valid OTP request
            const now = new Date().toISOString();
            const otpRecord = await sql`
                SELECT * FROM otp_requests 
                WHERE email = ${email.toLowerCase()} AND purpose = ${purpose} AND used_at IS NULL 
                AND expires_at > ${now}
                ORDER BY created_at DESC LIMIT 1
            `;

            if (otpRecord.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
            }

            const record = otpRecord.rows[0];

            // Check attempts
            if (record.attempts >= MAX_ATTEMPTS) {
                return res.status(400).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
            }

            // Verify OTP
            if (!verifyOTP(otp, record.otp_hash)) {
                // Increment attempts
                await sql`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ${record.id}`;
                const remaining = MAX_ATTEMPTS - record.attempts - 1;
                return res.status(400).json({
                    success: false,
                    message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
                });
            }

            // Mark OTP as used
            await sql`UPDATE otp_requests SET used_at = ${now} WHERE id = ${record.id}`;

            let user;

            if (purpose === 'register') {
                if (!payload?.rollNumber || !payload?.name) {
                    return res.status(400).json({ success: false, message: 'Missing registration data' });
                }

                const rollNumber = payload.rollNumber.trim().toLowerCase();
                const name = payload.name.trim();
                const phone = payload.phone?.trim() || null;

                // Check if already exists
                const existing = await sql`
                    SELECT id FROM students WHERE roll_number = ${rollNumber} OR email = ${email.toLowerCase()}
                `;

                if (existing.rows.length > 0) {
                    return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });
                }

                // Create student
                const result = await sql`
                    INSERT INTO students (roll_number, email, name, phone)
                    VALUES (${rollNumber}, ${email.toLowerCase()}, ${name}, ${phone})
                    RETURNING id, roll_number, email, name
                `;

                user = result.rows[0];
            } else {
                // Login: fetch existing user
                const result = await sql`
                    SELECT id, roll_number, email, name FROM students WHERE email = ${email.toLowerCase()}
                `;

                if (result.rows.length === 0) {
                    return res.status(400).json({ success: false, message: 'Account not found' });
                }

                user = result.rows[0];
            }

            // Create Firebase custom token
            let firebaseToken = null;
            if (admin.apps.length) {
                try {
                    firebaseToken = await admin.auth().createCustomToken(user.email, {
                        rollNumber: user.roll_number,
                        name: user.name
                    });
                } catch (e) {
                    console.error('Firebase token error:', e);
                }
            }

            // Create JWT
            const jwtToken = jwt.sign(
                { id: user.id, email: user.email, rollNumber: user.roll_number, name: user.name },
                process.env.JWT_SECRET || 'fallback-secret-change-in-production',
                { expiresIn: '7d' }
            );

            // Set cookie
            res.setHeader('Set-Cookie', `auth_token=${jwtToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

            return res.json({
                success: true,
                message: purpose === 'register' ? 'Registration successful' : 'Login successful',
                user: { id: user.id, email: user.email, rollNumber: user.roll_number, name: user.name },
                firebaseToken
            });
        }

        // GET /auth/me
        if (path === '/me' && req.method === 'GET') {
            const cookies = parseCookies(req.headers.cookie);
            const token = cookies.auth_token;

            if (!token) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
                return res.json({
                    success: true,
                    user: { id: decoded.id, email: decoded.email, rollNumber: decoded.rollNumber, name: decoded.name }
                });
            } catch {
                return res.status(401).json({ success: false, message: 'Invalid token' });
            }
        }

        // POST /auth/logout
        if (path === '/logout' && req.method === 'POST') {
            res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
            return res.json({ success: true, message: 'Logged out' });
        }

        return res.status(404).json({ success: false, message: 'Not found' });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
