# Brick by Brick 🧱

A modern, minimal, dark-themed Habit Tracker designed to help you build habits, one day at a time, brick by brick.

## Features
- **Notion-Style Month Grid**: Interactive day columns for tracking habit completions.
- **Real-Time Database Sync**: Real-time synchronization using Cloud Firestore.
- **Secure Authentication**: Built-in support for secure Email/Password and Google Sign-In.
- **Dashboard Statistics**: Dynamic calculation of Today's Score, Current Streak, Longest Streak, Monthly Completion Rate, and Total Completions.
- **Visual Analytics**: Beautiful graphs showing daily progress and a GitHub-style yearly contribution heatmap.
- **Local JSON Backup**: Export or import your entire habit history in one click.
- **Aesthetic Dark Theme**: MongoSnap-inspired forest green dashboard.

## Technology Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Modern CSS (Custom HSL theme variables)
- **Database/Auth**: Cloud Firestore & Firebase Authentication (Email, Google)
- **Charts**: Recharts
- **Icons**: Lucide React

## Setup & Local Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file and fill in your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Deploy Security Rules**:
   Make sure Firestore database exists in the project and deploy the rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules --project your_project_id
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
