# Setup & Deployment Instructions

This guide provides instructions on how to configure authentication (Email, Google) in your Firebase Console and deploy your Brick by Brick application to Vercel.

---

## 1. Firebase Authentication Setup

Go to the [Firebase Console](https://console.firebase.google.com/), open your project (`habit-tracker-9f0ab`), and select **Build -> Authentication** from the sidebar. Under the **Sign-in method** tab, configure the following:

### A. Email / Password (Enabled)
1. Click **Add new provider** and select **Email/Password**.
2. Toggle **Enable** to active. (Keep "Email link (passwordless sign-in)" disabled).
3. Click **Save**.

### B. Google Auth (Enabled)
1. Click **Add new provider** and select **Google**.
2. Toggle **Enable** to active.
3. Choose a **Project support email** from the dropdown.
4. Click **Save**.



## 2. Cloud Firestore Rules Deployment

To make sure your database is secure and unauthorized users cannot write/read other users' habits, deploy the security rules:

1. In your project folder, make sure the Firebase CLI is logged in. Open your local terminal and run:
   ```bash
   npx firebase login
   ```
2. Deploy the rules file (`firestore.rules`) using the CLI:
   ```bash
   npx firebase deploy --only firestore:rules --project habit-tracker-9f0ab
   ```
   *Note: This uploads the rules configured in your local `firestore.rules` directly to your Cloud Firestore instance.*

---

## 3. Local Verification

1. Double-check your local environment variables in your workspace's [`.env.local`](file:///Users/maneethreddy/Documents/Github/Habit%20Logging/.env.local) file. It should contain:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Test registering a user or logging in.

---

## 4. Deploying to Vercel

1. Push your code to your GitHub/GitLab/Bitbucket repository. (Make sure `.env.local` is **ignored** by git, which Vite does by default, as we want to keep credentials secure).
2. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New -> Project**.
3. Select your repository and import it.
4. Under **Environment Variables**, add the keys from your `.env.local`:
   - `VITE_FIREBASE_API_KEY` = `your_api_key_here`
   - `VITE_FIREBASE_AUTH_DOMAIN` = `your_auth_domain_here`
   - `VITE_FIREBASE_PROJECT_ID` = `your_project_id_here`
   - `VITE_FIREBASE_STORAGE_BUCKET` = `your_storage_bucket_here`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = `your_messaging_sender_id_here`
   - `VITE_FIREBASE_APP_ID` = `your_app_id_here`
5. Click **Deploy**. Vercel will bundle the Vite React app and publish it live!

---

## 5. Deploying to Firebase Hosting (Alternative)

If you prefer to keep everything inside the Firebase Console, you can deploy your application to Firebase Hosting:

1. In your local terminal, make sure you are logged in to the Firebase CLI:
   ```bash
   npx firebase-tools login
   ```
2. Build the project locally to compile production assets:
   ```bash
   npm run build
   ```
3. Deploy the build output and firestore rules in one command:
   ```bash
   npx firebase-tools deploy --project habit-tracker-9f0ab
   ```
   *(This will deploy your custom Firestore security rules and your React web application to `https://habit-tracker-9f0ab.web.app` / `https://habit-tracker-9f0ab.firebaseapp.com`.)*

