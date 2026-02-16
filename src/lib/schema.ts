import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').$type<'admin' | 'user'>().default('user').notNull(),
    isApproved: boolean('is_approved').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const youtubeNotes = pgTable('youtube_notes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    videoUrl: text('video_url').notNull(),
    videoTitle: text('video_title'),
    summary: text('summary').notNull(),
    studyNotes: text('study_notes').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
