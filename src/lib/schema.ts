import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').$type<'admin' | 'user'>().default('user').notNull(),
    isApproved: boolean('is_approved').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
