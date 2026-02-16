# AI Study Companion - React Dashboard

An intelligent study companion that generates structured notes and summaries from YouTube videos using AI.

## 🚀 Features

- **AI Summarization**: Instantly generates concise summaries and detailed study notes from YouTube videos.
- **YouTube Shorts Support**: Works with both standard videos and Shorts.
- **Robust Transcript Engine**: Uses `youtubei.js` (Innertube) to reliably fetch transcripts, mimicking a real YouTube client to bypass cloud IP blocks.
- **Persistent Library**: Saves all your generated notes to a personal library using Neon DB (PostgreSQL).
- **Secure Authentication**: Request-based signup with Admin approval workflow using NextAuth.js v5.
- **Modern UI**: Built with Next.js 15, Tailwind CSS, and Lucide Icons for a premium experience.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js (Auth.js) v5
- **AI Model**: Google Gemini 2.0 Flash (via OpenRouter)
- **Styling**: Tailwind CSS

## 📦 Deployment (Vercel)

This project is optimized for deployment on Vercel.

### Environment Variables
Ensure the following variables are set in your Vercel Project Settings:

- `DATABASE_URL`: Your Neon connection string (pooled).
- `AUTH_SECRET`: A random 32-character string for session security.
- `OPENROUTER_API_KEY`: API key from OpenRouter.ai.

## 🏃‍♂️ Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/amruthav0607/neon-16.git
   cd neon-16
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   Create a `.env.local` file with the required variables.

4. **Run the server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.
