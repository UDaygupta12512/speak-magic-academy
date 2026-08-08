# 🧞‍♂️ SpeakGenie — Fun AI Language Learning for Kids

<div align="center">

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

**SpeakGenie** is an engaging, AI-powered language practice companion designed specifically for children aged 6 to 16. It replaces boring rote memorization with interactive conversations, live voice calls, custom comic books, gamified challenges, and adaptive feedback in both **English and Hindi**.

[Explore Features](#-key-features) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [Project Structure](#-project-structure) • [Environment Variables](#-environment-variables)

</div>

---

## 🌟 Key Features

### 🎙️ AI Voice Calls & Conversational Practice
- **Real-Time AI Voice Call**: Simulated interactive voice calls with friendly characters where kids can chat, ask questions, sing songs, or practice conversational fluency.
- **Bilingual Support (English & Hindi)**: Seamless practice in English or Hindi (Devanagari script) with instant grammar corrections delivered gently and warmly.
- **Character Roleplay**: Immersive roleplaying scenarios that motivate children to expand their vocabulary and speak confidently.

### 🎨 AI Comic Book Creator
- **Interactive Comic Generation**: Turns children's creative story ideas into full multi-panel illustrated comic books.
- **Consistent Character Design**: Generates visual story scenes with rich art styles and matching character attributes across panels.
- **Bilingual Comic Scripts**: Automatic generation of child-friendly captions, dialogues, and reading narration in both English and Hindi.

### 🎮 Gamified Learning Activities
- **Word Games & Spelling Bee**: Fast-paced interactive spelling challenges and vocabulary games.
- **Phonics & Pronunciation**: Pronunciation practice with instant phonetic feedback.
- **Sentence Builder & Flashcards**: Drag-and-drop word blocks and interactive flashcard decks.
- **Tongue Twisters & Reading Practice**: Engaging speech fluency exercises and reading comprehension tasks.
- **Writing Coach**: Children write essays and stories to receive instant constructive feedback, grammar scores, and tips.

### 🏆 Motivation & Progress Tracking
- **Streak Tracker & XP System**: Daily login streaks, quest rewards, and XP milestones to build regular learning habits.
- **Rewards Shop**: Unlock avatars, character themes, and special badges using earned coins.
- **Leaderboards**: Compete with friends and classmates on weekly and all-time leaderboards.
- **Parent & Analytics Dashboard**: Detailed insights into child's learning curves, mastery mind maps, time spent, and vocabulary growth.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 5](https://vitejs.dev/) with SWC React Plugin |
| **Styling & Design System** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI Primitives](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) + `tailwindcss-animate` |
| **State & Data Fetching** | [@tanstack/react-query](https://tanstack.com/query/latest) |
| **Backend & Authentication** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Edge Functions) |
| **Visual Effects & Charts** | `canvas-confetti`, [Recharts](https://recharts.org/) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn** / **pnpm**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/UDaygupta12512/speak-magic-academy.git
   cd speak-magic-academy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory (or update the existing one):
   ```env
   VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:8080` to see the app in action!

---

## 📁 Project Structure

```text
├── public/                     # Static assets, icons, robots.txt
├── src/
│   ├── components/             # Reusable UI components & dialogs
│   │   └── ui/                 # Accessible Radix UI components (shadcn/ui)
│   ├── hooks/                  # Custom React hooks (useAuth, useSound, useSpeech, etc.)
│   ├── integrations/           # Backend client integration (Supabase)
│   ├── lib/                    # Utility functions, formatters, and helpers
│   ├── pages/                  # Page routes & views
│   │   ├── activities/         # Practice modules (Phonics, Roleplay, Games, etc.)
│   │   ├── Auth.tsx            # Sign in / Sign up page
│   │   ├── Call.tsx            # Live AI Voice Call interface
│   │   ├── ComicBook.tsx       # AI Comic Story generator & viewer
│   │   ├── Index.tsx           # Home Dashboard
│   │   ├── Learn.tsx           # Curriculum & lesson directory
│   │   └── ParentDashboard.tsx # Parent oversight & analytics
│   ├── App.tsx                 # App entry point, routing, and providers
│   ├── index.css               # Global theme tokens and styles
│   └── main.tsx                # React DOM render entry
├── supabase/
│   └── functions/              # Deno Serverless Edge Functions
│       ├── chat/               # Conversational AI & voice call backend
│       ├── comic-image/        # Comic panel illustration generator
│       ├── comic-script/       # Comic story & panel script generator
│       └── writing-feedback/   # Writing evaluation & grading
├── tailwind.config.ts          # Tailwind theme and animation configuration
├── vite.config.ts              # Vite configuration & path aliases
└── package.json                # Project dependencies and npm scripts
```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server at `http://localhost:8080` |
| `npm run build` | Builds the optimized production bundle in `dist/` |
| `npm run preview` | Serves the local production build for testing |
| `npm run lint` | Runs ESLint to check for code quality and lint errors |
| `npm run test` | Runs the test suite with Vitest |

---

## 🔒 Security & Best Practices

- **Role-Based Protected Routes**: Ensures child learning areas and parent dashboards are authenticated and protected.
- **Client-Side Sanitization**: Safe rendering of user-generated scripts and storytelling inputs.
- **Child-Friendly AI Safety**: System prompts enforce friendly, age-appropriate content with zero tolerance for inappropriate responses.
- **Optimized Bundle Splitting**: Lazy-loaded routes keep the initial bundle lightweight for fast mobile loading.

---

## 📄 License

This project is private and proprietary. All rights reserved.
