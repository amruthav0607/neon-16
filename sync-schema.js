const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_eA5WpsyjmX8w@ep-frosty-tooth-aiya2rq1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
    connectionString,
});

async function syncSchema() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected. Syncing full schema...');

        const migrationSql = `
      -- Create Role enum if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
          CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
        END IF;
      END
      $$;

      -- Create User table
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'USER',
        "isApproved" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

      -- Create Document table
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
      );

      -- Add foreign key
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_userId_fkey') THEN
          ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `;

        await client.query(migrationSql);
        console.log('Full schema synchronized successfully!');

        await client.end();
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

syncSchema();
