# YouTube Transcript Summarizer

A full-stack web app that extracts YouTube video transcripts and generates AI-powered summaries using Claude Haiku. Includes a Chrome extension for quick access.

## Features

- **Transcript Extraction** - Automatically fetches transcripts from YouTube videos
- **AI Summarization** - Generates concise summaries using Claude Haiku
- **Batch Processing** - Process up to 10 videos at once with real-time progress
- **Email Delivery** - Send summaries to any email address
- **Search & History** - Full-text search across all your summaries
- **Chrome Extension** - Summarize videos with one click while browsing YouTube
- **Dark Mode** - Default dark theme with light mode toggle

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js v5 with email OTP
- **AI**: Anthropic Claude Haiku
- **Email**: Resend
- **Database**: Upstash Redis
- **Deployment**: Vercel

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/m4cd4r4/samhradh.git
cd samhradh
npm install
```

### 2. Set Up Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Source |
|----------|--------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | [console.upstash.com](https://console.upstash.com) |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `EXTENSION_API_KEY` | Run: `openssl rand -hex 32` |

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. Click the extension icon → Options
6. Enter your app URL and API key

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/process` | POST | Process single video |
| `/api/batch` | POST | Process multiple videos (streaming) |
| `/api/history` | GET | Get paginated history |
| `/api/history` | DELETE | Delete summary(ies) |
| `/api/search` | GET | Search summaries |
| `/api/extension` | POST | Extension endpoint (API key auth) |

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add RESEND_API_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add AUTH_SECRET
vercel env add EXTENSION_API_KEY

# Deploy to production
vercel --prod
```

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── history/       # History page
│   ├── login/         # Login page
│   └── page.tsx       # Main app
├── components/        # React components
├── emails/            # React Email templates
├── extension/         # Chrome extension
├── lib/               # Utilities
│   ├── auth.ts        # OTP authentication
│   ├── email.ts       # Resend integration
│   ├── redis.ts       # Upstash Redis
│   ├── summarize.ts   # Claude API
│   ├── utils.ts       # URL parsing
│   └── youtube.ts     # Transcript fetching
└── types/             # TypeScript types
```

## License

MIT
