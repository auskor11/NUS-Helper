// Renews the OneMap API token (it lasts 3 days) and stores it in Firestore at
// users/{uid}/private/onemap for every account (readable under the existing
// per-user rules), where the app reads it for public transport routing
// (app/places.js loadOneMapRoutes). The OneMap email and password stay in
// GitHub secrets and never reach the app. Without them this does nothing.
import admin from "firebase-admin";

const {ONEMAP_EMAIL, ONEMAP_PASSWORD, FIREBASE_SERVICE_ACCOUNT_JSON} = process.env;
if (!ONEMAP_EMAIL || !ONEMAP_PASSWORD) {
  console.log("ONEMAP_EMAIL / ONEMAP_PASSWORD secrets not set; skipping. The app uses Transitous until they are.");
  process.exit(0);
}
const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
if (!serviceAccount.project_id) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid.");
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

const res = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({email: ONEMAP_EMAIL, password: ONEMAP_PASSWORD})
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.access_token) throw new Error(`OneMap token request failed (${res.status}): ${body.error || body.message || "no token"}`);

const db = admin.firestore();
const doc = {
  token: body.access_token,
  expiresAt: Number(body.expiry_timestamp) * 1000 || Date.now() + 3 * 86400000,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};
const users = await db.collection("users").listDocuments();
await Promise.all(users.map(u => u.collection("private").doc("onemap").set(doc)));
console.log(`Stored for ${users.length} account(s).`);
console.log(`OneMap token refreshed; expires ${new Date(Number(body.expiry_timestamp) * 1000).toISOString()}`);
