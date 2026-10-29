# SAT Question Bank (Firebase)

A SAT question bank web app built with **React + Tailwind CSS**, backed by **Firebase Authentication** and **Cloud Firestore**.

## Features

- **Dashboard**: totals + breakdown by subject/domain
- **Practice mode**: session setup, feedback, scoring, response logging to Firestore
- **Admin tools** (single configured admin email in `src/lib/firebase.js`):
  - **Add / edit / delete** questions
  - **Browse** the full bank with filters

## 1) Firebase setup

1. Create a Firebase project.
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore** database.
4. Register a **Web app** and copy the web config values into `.env` (see below).
5. Publish **Firestore security rules** (see `firestore.rules` in this repo). In the Firebase console: **Firestore Database → Rules**, paste the file contents and **Publish**. Or from this folder: `firebase deploy --only firestore:rules` (requires Firebase CLI and `firebase login`). If you change `ADMIN_EMAIL` in `src/lib/firebase.js`, update `adminEmail()` in `firestore.rules` to match.

## 2) Environment variables (web app)

1. Copy `.env.example` to `.env`
2. Fill in the `REACT_APP_FIREBASE_*` values from the Firebase console.

Restart the dev server after changing `.env`.

## 3) Admin email

The app treats exactly one email as admin (`ADMIN_EMAIL` in `src/lib/firebase.js`). Update that constant if your admin account changes.

## 4) Bulk import (optional)

This repo includes `data/questions.json` and a script that uses the Firebase Admin SDK:

1. Download a **service account key JSON** from Firebase (keep it private).
2. Save it as `serviceAccountKey.json` in the project root (this filename is gitignored).
3. Run:

```bash
npm install
npm run import:questions
```

## 5) Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Deploy to GitHub Pages (gh-pages)

1. Edit `package.json` and set `homepage` to your GitHub Pages URL.
2. Deploy:

```bash
npm run deploy
```

## Notes / troubleshooting

- **Missing env errors**: confirm every `REACT_APP_FIREBASE_*` variable is set and restart `npm start`.
- **Permission denied in Firestore**: check your security rules and that the user is signed in.
- **Images**: optional per-question `image_url`, or place files under `public/question-images/<id>.png` (also `.jpg` / `.jpeg`).
