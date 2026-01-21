import crypto from 'crypto';

// Generate 6-digit OTP
export function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Hash OTP using SHA-256
export function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

// Verify OTP against hash
export function verifyOTP(otp, hash) {
    return hashOTP(otp) === hash;
}
