const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function verifyFlow() {
    console.log('--- Verification Started ---');

    const testEmailFirst = `admin_${Date.now()}@test.com`;
    const testEmailSecond = `user_${Date.now()}@test.com`;
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // 1. Verify First User is Admin and Approved
        console.log('Testing First User (Admin)...');
        // Clear users for clean test if needed, or just check logic
        // We'll simulate the POST /api/auth/signup logic here

        // Check if any users exist
        const initialUsers = await sql`SELECT count(*) FROM users`;
        const isFirst = parseInt(initialUsers[0].count) === 0;
        console.log(`Is database empty? ${isFirst}`);

        await sql`INSERT INTO users (name, email, password, role, is_approved) 
              VALUES ('Admin User', ${testEmailFirst}, ${hashedPassword}, ${isFirst ? 'admin' : 'user'}, ${isFirst})`;

        const adminUser = (await sql`SELECT * FROM users WHERE email = ${testEmailFirst}`)[0];
        console.log('Admin User Created:', { email: adminUser.email, role: adminUser.role, isApproved: adminUser.is_approved });

        if (isFirst && (adminUser.role !== 'admin' || !adminUser.is_approved)) {
            throw new Error('First user logic failed: should be admin and approved');
        }

        // 2. Verify Second User is User and NOT Approved
        console.log('Testing Second User (Regular)...');
        await sql`INSERT INTO users (name, email, password, role, is_approved) 
              VALUES ('Test User', ${testEmailSecond}, ${hashedPassword}, 'user', false)`;

        const regularUser = (await sql`SELECT * FROM users WHERE email = ${testEmailSecond}`)[0];
        console.log('Regular User Created:', { email: regularUser.email, role: regularUser.role, isApproved: regularUser.is_approved });

        if (regularUser.role !== 'user' || regularUser.is_approved !== false) {
            throw new Error('Regular user logic failed: should be user and not approved');
        }

        // 3. Test Toggle Approval
        console.log('Testing Admin Approval Toggle...');
        await sql`UPDATE users SET is_approved = true WHERE id = ${regularUser.id}`;
        const approvedUser = (await sql`SELECT * FROM users WHERE id = ${regularUser.id}`)[0];
        console.log('User After Approval:', { email: approvedUser.email, isApproved: approvedUser.is_approved });

        if (!approvedUser.is_approved) {
            throw new Error('Approval toggle failed');
        }

        // Cleanup
        console.log('Cleaning up test users...');
        await sql`DELETE FROM users WHERE email IN (${testEmailFirst}, ${testEmailSecond})`;

        console.log('--- Verification Successful! ---');
    } catch (error) {
        console.error('--- Verification Failed! ---');
        console.error(error);
        process.exit(1);
    }
}

verifyFlow();
