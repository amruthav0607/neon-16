# AI Study Companion

A powerful, high-performance study platform designed to streamline learning through AI-driven summarization and document interaction.

## 🚀 Features

### 📺 YouTube Summarizer
- **Instant Analysis**: Generate structured study notes and executive summaries from any YouTube video.
- **Vercel Compatible**: Uses a lightweight transcript extraction engine optimized for serverless deployments.
- **Privacy Focused**: On-demand summarization without persistent history tracking.

### 📄 Document Q&A
- **Deep Document Insight**: Upload PDF or Text files and have interactive conversations with the AI about their content.
- **Full Content Processing**: Optimized to read and analyze lengthy documents (up to 30,000 characters) for comprehensive accuracy.

### ⚡ Powered By
- **Next.js 14**: Modern web framework for high-speed performance.
- **Neon Database**: Serverless Postgres with optimized connection management.
- **Groq AI (Llama 3.3)**: State-of-the-art inference for lightning-fast responses.
- **Prisma ORM**: Robust database modeling and type-safe queries.

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- A Neon Database account
- A Groq API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amruthav0607/neon-16.git
   cd neon-16
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables (`.env`):
   ```env
   DATABASE_URL="postgresql://user:pass@ep-host.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30"
   GROQ_API_KEY="your_groq_api_key"
   AUTH_SECRET="your_nextauth_secret"
   ```

4. Initialize Database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run Locally:
   ```bash
   npm run dev
   ```

## 🌐 Deployment

This project is optimized for deployment on **Vercel**. Ensure all environment variables are correctly configured in your Vercel project settings.
