# NUS Companion V8

V8 fixes Firebase Hosting navigation and stale PWA caching for the multi-page app.

## Deploy

From this folder:

```bash
firebase login
firebase use --add
firebase deploy
```

If this folder is already linked to your existing Firebase project, normally just:

```bash
firebase deploy
```

Do not delete or recreate Firestore. Hosting deployment does not erase Firestore data.

## If the old V7 PWA is still open

After the first V8 deployment, close the installed PWA completely and open the Firebase Hosting URL once in Brave. V8 uses a new service-worker cache name and network-first navigation, so future page changes should update without repeated hard refreshes.

\n## V9 fixed build\nThis build fixes the previous V9 regression by keeping the existing Firebase account/sync implementation and adding the sidebar controls after the shared shell is created.\n\nAfter deployment, if the old PWA is still cached once, open the site in Brave and do one hard refresh. The V9-fixed service worker then takes over automatically.\n

## V10 fixes
- Google authentication now uses popup on desktop and redirect on iPhone/iPad, with clearer Firebase error messages.
- Venue search now uses the NUS Campus Map as the primary coordinate source.
- Venue suggestions update locally while typing.
- Added README.md, ABOUT.md and GitHub description/topic suggestions.


## V13 authentication setup

V13 intentionally separates authentication from the main app.

Enable:
1. Authentication → Sign-in method → Google
2. Authentication → Sign-in method → Email/Password
3. Authentication → Settings → Authorised domains → your `*.web.app` domain

Unauthenticated visitors are automatically sent to `/login.html`.

After successful authentication, they are sent to `/index.html`.

The same Firebase UID is used as the Firestore path:
`users/{uid}/appState/main`


## V38 — Spark/free-plan build

- Removed the Cloud Functions proxy entirely; V38 does not require Firebase Blaze or a payment method.
- Bus Timings uses the live `bus.hewliyang.com` map directly, with specific-stop search and popular stops.
- Added a reliable top-level “Nearby stops” fallback for Brave/iOS, because browser privacy rules can prevent a cross-origin embedded map from receiving location permission.
- The Map page no longer has a separate bus-stop list panel.
- The Map page uses the full 33-stop coordinate catalogue from the public hewliyang stops dataset and displays red bus icons.
