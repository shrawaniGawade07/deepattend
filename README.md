# DeepAttend

AI-based attendance system built with Next.js 16, React 19, and TypeScript. Uses webcam-based face enrollment and matching to mark attendance automatically, with a full admin panel for student and record management.

## Features

- Webcam face enrollment and automatic matching
- Face-template cosine similarity matching (threshold: 0.88)
- Student database — name, email, roll number, department, semester, guardian email, phone
- Manual attendance fallback per student
- Attendance percentage calculation with 75% risk highlighting
- Admin panel — Dashboard, Students, Attendance Log, Settings
- Secure admin login (session-based)
- Data export as JSON backup
- Danger-zone data management (clear records / clear all)
- All data stored in browser `localStorage` — no backend needed for demos
- Responsive dark UI, single indigo accent

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 3
- **Language**: TypeScript
- **Storage**: `localStorage` (client-side)
- **No external API dependencies**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin panel at [http://localhost:3000/admin](http://localhost:3000/admin).
Default admin password: `admin123` (change in Settings after first login).

## How to Use

1. Go to the home page and click **Start Camera**.
2. Select a student from the dropdown and click **Enroll Face** to capture their face template.
3. Click **Scan** to automatically detect and mark attendance for enrolled students.
4. Visit `/admin` for the full management panel.

## Deploy

Deploy to Vercel:

```bash
npx vercel
```

Or import the GitHub repository in [vercel.com](https://vercel.com) — no environment variables required.

## Data Storage

All data lives in the user's browser `localStorage`. For multi-user or server-side persistence, swap `src/lib/storage.ts` with Supabase, Firebase, or any REST API.

## Project Structure

```
src/
  app/
    page.tsx          # Home — attendance scanner
    admin/page.tsx    # Admin panel
    layout.tsx        # Root layout
    globals.css       # Tailwind base + custom animations
  lib/
    types.ts          # TypeScript interfaces
    storage.ts        # localStorage helpers
    face.ts           # Face template extraction + cosine similarity
```
