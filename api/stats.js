import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

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

// Middleware to verify auth
function verifyAuth(req) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.auth_token;

    if (!token) return null;

    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    } catch {
        return null;
    }
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

    // Auth check
    const user = verifyAuth(req);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const path = req.url.replace('/api/stats', '').replace('/stats', '').split('?')[0];

    try {
        // GET /stats/summary
        if (path === '/summary' && req.method === 'GET') {
            const studentCount = await sql`SELECT COUNT(*) as count FROM students`;
            const otpCount = await sql`SELECT COUNT(*) as count FROM otp_requests`;
            const totalImpact = studentCount.rows[0].count * 10;

            return res.json({
                success: true,
                stats: {
                    studentCount: studentCount.rows[0].count,
                    otpCount: otpCount.rows[0].count,
                    totalImpact
                }
            });
        }

        // GET /stats/activity
        if (path === '/activity' && req.method === 'GET') {
            const activity = await sql`
                SELECT 
                    otp_requests.created_at, 
                    otp_requests.purpose,
                    students.name,
                    students.roll_number
                FROM otp_requests
                LEFT JOIN students ON otp_requests.email = students.email
                ORDER BY otp_requests.created_at DESC
                LIMIT 20
            `;

            return res.json({
                success: true,
                activity: activity.rows
            });
        }

        return res.status(404).json({ success: false, message: 'Not found' });
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
