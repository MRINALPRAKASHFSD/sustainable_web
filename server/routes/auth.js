import { Router } from 'express';
import jwt from 'jsonwebtoken'; // Keeping JWT for backward compatibility or as a backup
import db from '../db.js';
import { generateOTP, hashOTP, verifyOTP } from '../utils/otp.js';
import { sendOTPEmail } from '../utils/email.js';
import admin from 'firebase-admin';

// Initialize Firebase Admin from environment variable
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        if (serviceAccount.project_id) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin initialized');
        } else {
            console.log('⚠️ Firebase not configured - FIREBASE_SERVICE_ACCOUNT env var missing');
        }
    } catch (e) {
        console.error('❌ Firebase init error:', e.message);
    }
}

const router = Router();
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// Helper: resolve email from identifier
function resolveEmail(identifier) {
    identifier = identifier.trim().toLowerCase();
    if (identifier.includes('@')) {
        if (!identifier.endsWith('@krmu.edu.in')) return null;
        return identifier;
    }
    // Validate roll number format (alphanumeric, 5-15 chars)
    if (!/^[a-z0-9]{5,15}$/i.test(identifier)) return null;
    return `${identifier}@krmu.edu.in`;
}

// POST /auth/request-otp
router.post('/request-otp', async (req, res) => {
    try {
        const { identifier, purpose } = req.body;

        if (!identifier || !['register', 'login'].includes(purpose)) {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        const email = resolveEmail(identifier);
        if (!email) {
            // Generic response to prevent enumeration
            return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
        }

        const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email);

        // Purpose-specific validation (silent - don't reveal account existence)
        if (purpose === 'login' && !student) {
            return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
        }
        if (purpose === 'register' && student) {
            return res.json({ success: true, message: 'If eligible, you will receive an OTP' });
        }

        // Check rate limit: max 5 OTPs per hour, 30s between requests
        const recentOTPs = db.prepare(`
      SELECT COUNT(*) as count, MAX(created_at) as last_sent 
      FROM otp_requests 
      WHERE email = ? AND created_at > datetime('now', '-1 hour')
    `).get(email);

        if (recentOTPs.count >= 5) {
            return res.status(429).json({ success: false, message: 'Too many requests. Try again later.' });
        }

        if (recentOTPs.last_sent) {
            const lastSent = new Date(recentOTPs.last_sent + 'Z');
            const diff = (Date.now() - lastSent.getTime()) / 1000;
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

        db.prepare(`
      INSERT INTO otp_requests (email, purpose, otp_hash, expires_at, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, purpose, otpHash, expiresAt, req.ip);

        // Send email
        try {
            await sendOTPEmail(email, otp, purpose);
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            // In development, log OTP to console
            if (process.env.NODE_ENV === 'development') {
                console.log(`[DEV] OTP for ${email}: ${otp}`);
            }
        }

        res.json({ success: true, message: 'If eligible, you will receive an OTP' });
    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, purpose, payload } = req.body;

        if (!email || !otp || !['register', 'login'].includes(purpose)) {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ success: false, message: 'Invalid OTP format' });
        }

        // Find valid OTP request
        const otpRecord = db.prepare(`
      SELECT * FROM otp_requests 
      WHERE email = ? AND purpose = ? AND used_at IS NULL 
      AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get(email.toLowerCase(), purpose);

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
        }

        // Check attempts
        if (otpRecord.attempts >= MAX_ATTEMPTS) {
            return res.status(400).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
        }

        // Verify OTP
        if (!verifyOTP(otp, otpRecord.otp_hash)) {
            // Increment attempts
            db.prepare('UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
            const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1;
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            });
        }

        // Mark OTP as used
        db.prepare('UPDATE otp_requests SET used_at = datetime("now") WHERE id = ?').run(otpRecord.id);

        let user;

        if (purpose === 'register') {
            // Validate registration payload
            if (!payload?.rollNumber || !payload?.name) {
                return res.status(400).json({ success: false, message: 'Missing registration data' });
            }

            const rollNumber = payload.rollNumber.trim().toLowerCase();
            const name = payload.name.trim();
            const phone = payload.phone?.trim() || null;

            // Check if already exists (race condition protection)
            const existing = db.prepare('SELECT id FROM students WHERE roll_number = ? OR email = ?')
                .get(rollNumber, email.toLowerCase());

            if (existing) {
                return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });
            }

            // Create student in local DB (as backup/sync)
            const result = db.prepare(`
        INSERT INTO students (roll_number, email, name, phone)
        VALUES (?, ?, ?, ?)
      `).run(rollNumber, email.toLowerCase(), name, phone);

            user = { id: result.lastInsertRowid, rollNumber, email: email.toLowerCase(), name };
        } else {
            // Login: fetch existing user
            user = db.prepare('SELECT id, roll_number as rollNumber, email, name FROM students WHERE email = ?')
                .get(email.toLowerCase());

            if (!user) {
                return res.status(400).json({ success: false, message: 'Account not found' });
            }
        }

        // --- FIREBASE INTEGRATION ---
        // Create a custom token for the user
        // We use the email as the UID to keep it simple and consistent
        const firebaseToken = await admin.auth().createCustomToken(user.email, {
            rollNumber: user.rollNumber,
            name: user.name
        });

        // Also issue our cookie JWT for existing backend compatibility
        const token = jwt.sign(
            { id: user.id, rollNumber: user.rollNumber, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            firebaseToken, // <--- Frontend will use this to signInWithCustomToken
            user: { rollNumber: user.rollNumber, email: user.email, name: user.name }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /auth/me - Get current user from token
router.get('/me', (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = db.prepare('SELECT roll_number as rollNumber, email, name FROM students WHERE id = ?')
            .get(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user });
    } catch {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

export default router;
