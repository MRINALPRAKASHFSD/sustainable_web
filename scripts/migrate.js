/**
 * Migration script for Vercel Postgres
 * Run this once after creating your Vercel Postgres database
 * 
 * Usage:
 * node scripts/migrate.js
 */

import { sql } from '@vercel/postgres';

async function migrate() {
    console.log('🚀 Starting database migration...\n');

    try {
        // Create students table
        console.log('📝 Creating students table...');
        await sql`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                roll_number VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✅ students table created\n');

        // Create otp_requests table
        console.log('📝 Creating otp_requests table...');
        await sql`
            CREATE TABLE IF NOT EXISTS otp_requests (
                id SERIAL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login')),
                otp_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                attempts INT DEFAULT 0,
                ip VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✅ otp_requests table created\n');

        // Create indices for performance
        console.log('📝 Creating indices...');
        await sql`
            CREATE INDEX IF NOT EXISTS idx_otp_email_purpose 
            ON otp_requests(email, purpose)
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS idx_otp_expires 
            ON otp_requests(expires_at)
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS idx_student_email 
            ON students(email)
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS idx_student_roll 
            ON students(roll_number)
        `;
        console.log('✅ Indices created\n');

        console.log('✨ Migration completed successfully!');
        console.log('\n📋 Tables created:');
        console.log('   - students');
        console.log('   - otp_requests\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
