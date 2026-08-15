/*
 * NUS Companion V11 Firebase configuration.
 *
 * OPTION A (recommended):
 * Deploy with Firebase Hosting. V11 automatically tries:
 *   /__/firebase/init.json
 *   /__/firebase/init.js
 *
 * OPTION B:
 * Paste the Firebase Web App config from:
 * Firebase Console → Project settings → Your apps → Web app
 *
 * Replace the values below with your REAL values.
 */
// Optional Google Places integration for searching locations not in NUSMods.
window.NUS_GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

window.NUS_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
