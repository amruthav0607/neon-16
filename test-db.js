const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_eA5WpsyjmX8w@ep-frosty-tooth-aiya2rq1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
    connectionString,
});

async function testConnection() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
