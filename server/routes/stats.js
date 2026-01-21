import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

router.use(requireAuth);

// GET /stats/summary
router.get('/summary', (req, res) => {
    try {
        const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
        const otpCount = db.prepare('SELECT COUNT(*) as count FROM otp_requests').get().count;
        // Mock impact score for now (e.g. 10 points per student)
        const totalImpact = studentCount * 10;

        res.json({
            success: true,
            stats: {
                studentCount,
                otpCount,
                totalImpact
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /stats/activity - Recent activity (using OTP requests as proxy for now)
router.get('/activity', (req, res) => {
    try {
        const limit = 20;
        // Join with students table if possible, otherwise just show email
        const activity = db.prepare(`
            SELECT 
                otp_requests.created_at, 
                otp_requests.purpose,
                students.name,
                students.roll_number
            FROM otp_requests
            LEFT JOIN students ON otp_requests.email = students.email
            ORDER BY otp_requests.created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({ success: true, activity });
    } catch (error) {
        console.error('Activity error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
