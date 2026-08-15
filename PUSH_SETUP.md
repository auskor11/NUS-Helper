# NUS Companion V65 — Background Web Push setup

V65 adds real Web Push delivery. The browser registers a PushSubscription and stores it under the signed-in user's Firestore record. A GitHub Actions job checks reminders every 5 minutes and sends the push through the Web Push protocol. iPhone Home Screen web apps support standards-based Web Push on iOS/iPadOS 16.4+; the permission request must be triggered by direct user interaction.

## 1. Deploy V65

Deploy the project to Firebase Hosting after completing the configuration below.

## 2. Generate VAPID keys (recommended)

On your Mac, run:

```bash
npx web-push generate-vapid-keys --json
```

The command prints a `publicKey` and `privateKey`. Replace the `vapidPublicKey` value in `push-config.js` with the generated **publicKey**. Add the **privateKey** to GitHub as the `VAPID_PRIVATE_KEY` Actions secret. Never commit the private key.

V65 includes a generated public key already, but if you use it, use the matching private key from the separate file provided with this V65 package.

## 3. GitHub repository secrets/variables

Create:

**Secret**
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the full JSON for a Google/Firebase service account that can read/write Firestore.
- `VAPID_PRIVATE_KEY` — your VAPID private key.

**Repository variables**
- `VAPID_PUBLIC_KEY` — the same public key in `push-config.js`.
- `VAPID_SUBJECT` — for example `mailto:your-email@example.com`.

The service account JSON is sensitive. Do not commit it to GitHub.

## 4. Firebase service account

Create a service account in Google Cloud/Firebase with permission to access Firestore. Download its JSON key and store the entire JSON as the `FIREBASE_SERVICE_ACCOUNT_JSON` GitHub secret. The GitHub Action uses the Admin SDK and therefore does not expose this credential to the browser.

## 5. iPhone test

1. Open the deployed site on iPhone.
2. Add NUS Companion to the Home Screen.
3. Open the Home Screen app.
4. Sign in.
5. Tap the 🔔 notification button and choose **Enable notifications**. This direct tap is required for iOS Web Push permission.
6. Create a task whose 1-day reminder is within the next few minutes.
7. Close the PWA completely.
8. Wait for the GitHub Actions run (up to roughly 5 minutes, plus GitHub scheduling delay).
9. The push should arrive without reopening the app.

## Important timing note

GitHub Actions scheduled workflows have a 5-minute minimum schedule and GitHub may delay scheduled jobs. Therefore the background notification is designed to be **near the reminder time**, not guaranteed to arrive at the exact second.

The app's existing foreground checker remains as a fallback while the PWA is open.


## V66 update — Background push testing and diagnostics

- Added a manual GitHub Actions **test notification** mode that sends a Web Push to every registered device.
- GitHub Actions workflow now reports users, subscriptions, reminder candidates, pushes sent/failed, and removed expired subscriptions.
- Increased the normal reminder detection window from 2 minutes to 15 minutes to tolerate GitHub scheduled-run delays.
- The test mode is independent of task/activity deadlines, so it can verify the Web Push pipeline directly.


## V66 manual background-push test

1. Confirm `VAPID_PRIVATE_KEY` and `FIREBASE_SERVICE_ACCOUNT_JSON` are GitHub Actions secrets.
2. Confirm `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` are GitHub Actions variables.
3. Open GitHub → Actions → **NUS Companion Push Reminders** → **Run workflow**.
4. Set **Send a test push notification to every registered device** to `true` and run it.
5. Open the workflow run and inspect the JSON summary. `pushesSent` should be at least 1 for a registered device.
6. The iPhone does not need the PWA open for this test; it must have previously granted notification permission and registered its push subscription.


## V66.1 diagnostics
- Added temporary Firebase/Firestore diagnostics to the push worker so the GitHub Actions log reports the configured project, database, and number of `/users` documents returned.


## V66.2 Firestore diagnostic
- Temporarily prints the top-level collections visible to the Admin SDK.
- Temporarily performs a direct read of the specified Firebase Auth user document and its `pushSubscriptions` subcollection.
- Before pushing, replace `REPLACE_WITH_YOUR_FIREBASE_USER_UID` in `.github/workflows/push-reminders.yml` with the UID shown in Firebase Console under `users` (do not use the 64-character push subscription document ID).
- Remove the diagnostic variable after troubleshooting is complete.


## V66.3 — Background Web Push fix
- Replaced the incorrect `sw.js` application script with a real service worker that handles `push` events and displays background notifications.
- Added notification-click handling so tapping a reminder opens the relevant page.
- Ensures `users/{uid}` exists before saving app state or push subscriptions, so GitHub Actions can discover registered devices.


## V66.4 — Firestore push setup permission fix
- Fixed Firestore rules so signed-in users can create/update their own `users/{uid}` parent document.
- This allows the notification setup code to save the Web Push subscription without a `missing or insufficient permissions` error.
- Existing `pushSubscriptions` documents and the V66.3 background service worker are preserved.


## V67 — Notification system cleanup
- Removed temporary Firebase/Firestore diagnostic logging used during Web Push troubleshooting.
- Preserved the working background Web Push service worker and GitHub Actions sender.
- Preserved automatic `users/{uid}` creation before app-state and push-subscription writes.
- Preserved the 15-minute reminder detection window and manual test-notification workflow.
- Production workflow output is concise: users checked, subscriptions found, push attempts, pushes sent, and failures.
