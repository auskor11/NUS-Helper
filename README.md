# NUS Companion V11

A personal Progressive Web App for NUS students to manage modules, timetables, activities, tasks and campus navigation in one place.

## Features

- 📚 Import modules and lesson groups from NUSMods
- 🗓️ Hour-by-hour weekly timetable
- 🏀 One-time and recurring activities
- ✅ Tasks with date/time deadlines
- 🗺️ NUS campus venue search, bus stops and live location
- 🔐 Google sign-in with Firebase Authentication
- ☁️ Firestore cloud sync across devices
- 📱 Installable PWA

## Firebase setup

**This step is required for Google sign-in and cloud sync.**

### 1. Create/register a Firebase Web App

Firebase Console → Project settings → Your apps → **Add app → Web**

You must have a Web App registered. A Firebase project by itself is not enough for this app's client SDK.

### 2. Enable Google authentication

Firebase Console → Authentication → Sign-in method → Google → Enable.

Also check Authentication → Settings → Authorised domains and make sure your Firebase Hosting domain is listed.

### 3. Create Firestore

Create Firestore in Production mode and deploy the included rules:

```bash
firebase deploy --only firestore
```

### 4. Deploy Hosting

From the extracted project folder:

```bash
firebase login
firebase use --add
firebase deploy
```

Open the resulting `*.web.app` URL. V11 first tries Firebase Hosting's reserved config endpoints automatically.

### If the app still says Firebase configuration was not found

Open Firebase Console → Project settings → Your apps → your Web app → **SDK setup and configuration → Config**.

Copy the configuration into:

```text
firebase-config.js
```

replacing:

```text
YOUR_API_KEY
YOUR_PROJECT_ID
YOUR_MESSAGING_SENDER_ID
YOUR_APP_ID
```

Do not change the JavaScript variable name.

## Updating later

Normally:

```bash
firebase deploy
```

Do not recreate the Firebase project or Firestore database for an app update.

## Location data

The map uses NUS Campus Map data as the primary source for NUS-specific coordinates, NUSMods venue data as a secondary source, and OpenStreetMap/Nominatim as a fallback.

## Disclaimer

NUS Companion is an independent personal project and is not affiliated with or endorsed by NUS or NUSMods.


## V13 authentication

V13 uses a dedicated login page.

Users are redirected to `/login.html` when they are not authenticated. The login page supports:

- Google sign-in
- Email/password login
- Email/password account registration

### Firebase Console settings

Enable both providers:

**Authentication → Sign-in method**
- Google → Enable
- Email/Password → Enable

Also add your Firebase Hosting domain under:

**Authentication → Settings → Authorised domains**

A Firebase **Web App** must be registered under:

**Project settings → Your apps → Add app → Web**

If V13 says Firebase configuration was not found, the project is either not being opened from Firebase Hosting or the Web App config has not been placed in `firebase-config.js`.


## V13 Firebase Auth fix

The authentication layer uses Firebase's browser compat SDK consistently. This is intentional for this plain HTML/JS PWA and prevents modular/compat Auth objects from being mixed.

\n## V15 authentication fix\n\nV15 fixes the Google login redirect loop by waiting for Firebase's first `onAuthStateChanged` event before the protected-page authentication guard makes a decision. Firebase Auth persistence is explicitly set to `LOCAL`, so a successful Google login survives page navigation and browser restarts where supported.\n

## V16 notes

### Venue codes such as `TP-SR-5`

Some NUS venue codes are room identifiers rather than standalone building names. For example, `TP-SR1`–`TP-SR9` are seminar rooms in Town Plaza. NUS documentation places these rooms in UT22, Level 2. The NUS Campus Map may expose the parent building/venue but not every individual room as a separately geocoded point.

The app therefore treats these codes as:
1. exact NUS Campus Map locations when available;
2. NUSMods venue entries when available;
3. parent-building/fallback location when a room-level coordinate does not exist;
4. OpenStreetMap only as a final fallback.



## V17 venue coordinates

V17 now gives **NUSMods coordinates first priority whenever the NUSMods venue payload actually contains latitude/longitude data**. The app accepts common coordinate representations (`lat/lng`, `lat/lon`, `latitude/longitude`, nested location/coordinates objects, and GeoJSON-style coordinates).

If the current NUSMods `venues.json` response only contains venue identifiers/names for a venue, there is no coordinate to use from that response; V17 then falls back to the NUS Campus Map and finally external geocoding. This prevents the app from inventing coordinates.

The NUSMods API documentation describes `venues.json` as a list of venues used in module lessons and notes that it is not a comprehensive list of locations. It does not document latitude/longitude as a guaranteed field of that endpoint. 


## V18 map update

V18 uses the coordinate dataset maintained inside the official NUSMods open-source repository at `website/api/optimiser/_constants/venues.json`. The dataset maps venue codes to coordinates using `location.x` (longitude) and `location.y` (latitude). NUSMods' optimiser documentation confirms that venue coordinates are stored in this file.

This means venue searches such as `TP-SR5`, `LT11`, and room-level codes can use the same GPS data that NUSMods uses instead of relying on geocoding.

The app keeps NUS Campus Map and external geocoding as fallbacks if a venue is absent from the NUSMods coordinate dataset.


## V19 location fix

V18's NUSMods coordinate lookup was returning coordinates as `{ lat, lng }`, while the final marker-rendering step expected the NUS Campus Map's `{ lat, long }` shape. That mismatch converted every valid NUSMods longitude into `undefined`, causing the "returned invalid map coordinates" error.

V19 normalises `lng`, `long`, and `longitude` before placing the marker. It also uses a V19 cache key so stale V18 geocoding results are not reused.


## V20 location fix

V20 fixes the final NUSMods-to-Leaflet coordinate conversion. NUSMods stores longitude in `location.x` and latitude in `location.y`; the app now normalises all supported coordinate shapes immediately before creating the marker. V20 also stops automatically locating the first search result before the user selects it, preventing false errors while typing.


## V21 map/search fix

V21 restores the venue-search UI that was accidentally omitted from V20. Typing now immediately renders matching venues, Enter performs the search, and selecting a result places the venue on the map and closes the result list.

Bus stops no longer depend on the NUS Campus Map endpoint succeeding. The app always loads its bundled NUS bus-stop dataset and merges live Campus Map bus stops when available, so a Campus Map/network failure cannot leave the bus-stop panel empty.


## V21 map fix

V21 restores the complete V19 NUS venue-search pipeline and adds Google Places only as a fallback for locations not found through NUSMods/NUS Campus Map. Search errors are caught so the UI cannot remain stuck on the loading spinner.



## V22 updates

- NUS bus stops now use red bus-shaped map markers instead of blue circles.
- Editing a module now includes **Import from NUSMods**, so lecture/tutorial/recitation groups can be added without leaving the module editor. Existing lesson timings are kept; duplicate groups are skipped.
- Activities now support editing existing recurring or one-time activities, including the activity name, club, related module, date/day, start/end time and venue.


### V22 map search expansion

The Map search bar now supports both NUS venues and ordinary Singapore locations/addresses. NUSMods/NUS Campus Map remains the preferred source for NUS venues. If there is no NUS match, the app searches an external map provider and can place the returned location on the same Leaflet map. For a private location such as "my home", enter the home address (the app cannot know a user's home address from the word "home" alone).


## V23 map search fixes

- External search results now pass their returned latitude/longitude directly to the Leaflet map instead of being sent through the NUS-only venue lookup.
- The search suggestions can now show external Singapore locations while typing, including MRT stations and ordinary addresses.
- Photon is used for lightweight external autocomplete; explicit Search/Enter continues to use Google Places when configured, followed by Nominatim and Photon fallbacks.
- The search remains NUSMods-first for NUS timetable venues.


## V24 mobile Google sign-in

V24 fixes Google sign-in on iPhone/Brave by explicitly processing Firebase's redirect result after returning from Google and by using the Firebase Hosting domain as `authDomain` on `*.web.app`/`*.firebaseapp.com` hosts.

If the phone still reports `auth/unauthorized-domain`, open Firebase Console → Authentication → Settings → Authorized domains and add your exact Firebase Hosting domain (for example `your-project.web.app`). If you use a custom domain, set that domain as the Firebase Auth `authDomain` in the Web App configuration and ensure the OAuth redirect URI `https://YOUR-DOMAIN/__/auth/handler` is authorised as required by Firebase.
\n\n## V26 updates\n\n- Fixed mobile sidebar duplicate close buttons and drawer reopen behaviour.\n- Weekly calendar now includes a current-time indicator, module lessons, activities, and task deadlines.\n- Fixed Sunday-first month calendar alignment.\n- Task page now explains the selection checkbox versus the completion checkbox.\n- Bus Timings now includes a live-arrivals board using the community NUS NextBus site at bus.hewliyang.com where stable stop pages are available.\n

## V27 updates

- Fixed 24-hour HTML time parsing so activity and task times render correctly.
- Fixed weekly calendar rendering for activities and task deadlines.
- Clarified and aligned task selection/completion checkboxes.
- Reworked mobile sidebar to use one reliable open/close control.
- Overdue-task popup now checks after Firebase cloud state restoration and can show on each home-page visit.


## V29 updates

- Fixed Leaflet map stacking so the mobile sidebar stays above the map.
- NUS bus stops now render from a built-in fallback immediately, then refresh from the official NUS Campus Map data when available.
- Added a timeout so a blocked/slow NUS map endpoint cannot leave Bus Timings stuck loading.


## V30 updates

- Rebuilt the Bus Timings page from scratch around bus.hewliyang.com.
- Added bus-stop search and a live stop view.
- Selected stops load the actual hewliyang live page inside the app.
- Added a directory of common NUS bus stops and direct links to their live boards.


## V31 updates

- Added the NUS bus-stop map directly to the Bus Timings page.
- Popular bus stops now appear immediately below the search bar and above the map.
- Added current-location support to the Bus Timings map using the browser Geolocation API.


## V32 updates

- Removed the custom Bus Timings map from NUS Companion.
- Bus Timings now embeds the actual NUS NextBus page from bus.hewliyang.com.
- The embedded page is granted geolocation permission so its own “Enable location” / nearby-stop feature can request the device location.
- Searching a specific stop still opens that stop's live hewliyang page.


## V38 — Spark/free-plan build

- Removed the Cloud Functions proxy entirely; V38 does not require Firebase Blaze or a payment method.
- Bus Timings uses the live `bus.hewliyang.com` map directly, with specific-stop search and popular stops.
- Added a reliable top-level “Nearby stops” fallback for Brave/iOS, because browser privacy rules can prevent a cross-origin embedded map from receiving location permission.
- The Map page no longer has a separate bus-stop list panel.
- The Map page uses the full 33-stop coordinate catalogue from the public hewliyang stops dataset and displays red bus icons.


## V39 updates

- Fixed task selection checkbox alignment so it stays beside the task name.
- Fixed the initial Bus Timings map loading overlay so it cannot remain stuck indefinitely on the homepage.
- Added direct bus-stop deep links from Map markers to Bus Timings, including the selected stop.
- Bus stop markers no longer get duplicated when the map loads.


## V39 updates

- Fixed task selection checkbox alignment so it stays directly beside the task name.
- Fixed the Bus Timings loading overlay so the initial NextBus map disappears from the loading state when the map finishes loading.
- Added support for opening Bus Timings directly from a selected bus stop on the Map page; the selected stop is automatically loaded from the `?stop=` URL parameter.


## V40 updates

- Fixed the task selection checkbox so it is horizontally aligned beside the task name.
- Expanded Bus Timings from NUS-only stops to Singapore-wide bus stops.
- Added live arrival cards using BusRouter SG / ArriveLah data for public bus stops.
- Added bus-stop search by name, road, landmark text, or 5-digit stop code.
- Added nearby bus-stop search using device geolocation.
- V40 remains static-hosting/Firebase Spark compatible; no Cloud Functions are required.

### Bus data sources

Singapore-wide bus stop and live arrival functionality in V40 uses BusRouter SG / ArriveLah. BusRouter SG documents that its stop, route and arrival data is derived from LTA public-transport information. The official LTA DataMall Bus Arrival API also exists, but its dynamic APIs require an Account Key, so V40 does not require a paid Firebase backend or a hidden API key.


## V41 updates

- Fixed task selection checkbox alignment using a dedicated two-column task layout.
- Fixed Singapore-wide bus-stop loading by switching to the current BusRouter SG data server format, with a legacy fallback source.
- Added a clearer loading message while the Singapore-wide bus catalogue is being fetched.


## V42 updates

- Restored a dedicated live NUS shuttle section using the hewliyang NUS NextBus source.
- Added selectable NUS shuttle stops and direct live-stop links.
- Added an interactive Leaflet bus-stop map showing NUS shuttle stops and Singapore public bus stops in the visible map area.
- Map markers can open the relevant live bus timings; the map also supports the user's current location.


## V43 updates

- Renamed the dedicated Bus Timings page to **NUS Bus Timings** and focused it on NUS shuttle services.
- Moved Singapore-wide public bus discovery to the **Map** page.
- Added Singapore-wide bus-stop markers to the map using the BusRouter SG catalogue.
- Public bus stops use smaller yellow bus markers; clicking one opens live public-bus arrivals below the map.
- NUS shuttle markers remain available on the map and link to the dedicated NUS Bus Timings page.


## V44 updates

- Simplified NUS Bus Timings to the **LIVE SOURCE** view, with NUS stop search and nearby-stop discovery.
- Improved Map performance by rendering Singapore public bus markers only in/near the current viewport, with adaptive marker limits at low zoom.
- Prevented duplicate public/NUS bus-stop icons from overlapping; shared stops use the NUS marker with separate NUS-shuttle and public-bus timing actions.


## V45 updates

- Aligned **My location** directly beside the venue search controls.
- Added a Citymapper-inspired **Journey Planner** with start/destination search, current-location start, mode preferences, route selection and **Start navigating**.
- Start navigating opens an official Citymapper directions URL with the selected coordinates.


## V46 updates

- Removed the Journey Planner section from the Maps page.
- Added **Navigate here** directly to searched venue/location map popups.
- The navigation action requests the user's current location, then opens Citymapper with the current location as the start and the selected NUS/location coordinates as the destination.
- Citymapper was chosen because its Singapore service includes NUS shuttle services; its Singapore pages expose NUS shuttle routes/stops such as CLB and LT27.


## V47 updates

- Fixed the **Navigate here** button on Map venue popups. The popup handler is now attached before the popup opens, preventing Leaflet's popup lifecycle from dropping the click handler.
- Navigation now uses top-level browser navigation with `window.location.assign()` and gracefully falls back to opening the destination if current-location permission is unavailable.


## V48 updates

- Venue locations on Dashboard, Calendar, Modules and Activities are now clickable and open the Maps page with the selected location pinned.
- Added deep-link support to the Maps page via `?location=`.
- Fixed the mobile sidebar by removing the duplicate mobile trigger and keeping a single reliable menu button above the page content.


## V49 updates

- Venue links now use a neutral, muted style that fits dark mode and calendar event bubbles instead of the default blue hyperlink colour.
- The Maps page now keeps a persistent Google Maps-style blue current-location marker when location permission is available. It updates as the device moves without automatically recentering the map.


# NUS Companion — Current Project Guide

NUS Companion is a personal NUS student dashboard/PWA for managing modules, timetables, activities, tasks, campus locations and NUS bus information.

## Current features

- 📚 **Modules** — add modules and import lesson groups from NUSMods.
- 🗓️ **Calendar** — monthly and weekly views with lessons, activities, tasks and a live current-time indicator.
- 🏀 **Activities** — one-time/recurring activities with editable details and clickable venues.
- ✅ **Tasks** — deadlines, editing, completion, individual deletion and multi-select deletion.
- 🗺️ **Maps** — NUS venue search, NUS/public bus stops, current-location marker and direct navigation to locations.
- 🚌 **NUS Bus Timings** — NUS shuttle stop search, nearby stops and live-source access.
- 🔐 **Authentication** — Firebase Google sign-in and email/password authentication.
- ☁️ **Cloud sync** — Firebase Firestore sync across signed-in devices.
- 📱 **PWA** — installable on supported browsers.

## Tech stack

HTML · CSS · JavaScript · PWA · Firebase Authentication · Cloud Firestore · Firebase Hosting · Leaflet · NUSMods API · NUS Campus Map · OpenStreetMap/Nominatim

## Run locally

Because authentication and Firebase Hosting configuration are part of the project, the recommended setup is to serve the project through Firebase Hosting.

```bash
firebase login
firebase use --add
firebase deploy
```

For local development, use a local web server rather than opening the HTML files directly with `file://`.

## Firebase

1. Register a Firebase **Web App**.
2. Enable **Google** and **Email/Password** under Authentication.
3. Create Firestore.
4. Add the Firebase Hosting domain to Authentication → Settings → Authorised domains.
5. Deploy the project with Firebase Hosting.

The app can obtain its Firebase configuration from Firebase Hosting. Alternatively, place the Web App configuration in `firebase-config.js`.

## Updating the deployed app

After changing the code:

```bash
firebase deploy
```

You do not need to create a new Firebase project or database for normal app updates.

## Project status

This is an independent personal student project and is not affiliated with or endorsed by NUS or NUSMods.


## V51 updates

- Restored and hardened the red current-time line in the weekly calendar.
- The line now updates every 30 seconds without rebuilding the calendar and is rendered above timetable events.


## V52 update

- Fixed Maps → **View NUS shuttle timings** so the selected stop is passed to the NUS Bus Timings page and automatically loaded into the live hewliyang source.


## V53 update

- Added a dedicated **public bus stop search** on the Maps page. Search by 5-digit stop code, stop name or road, select a result, and the map will zoom to and pin the stop.
- The selected public stop popup also provides access to its live public-bus timings.


## V54 update

- Fixed the public-bus search result popup so **View public bus timings** works immediately after a stop is selected.
- Added a persistent Google Maps-style blue current-location dot that follows the device location without moving the map automatically.


## V55 update

- Fixed the Maps page NUS shuttle bus markers by removing the campus-location loading race; NUS bus stops are now loaded only after the NUS campus data is ready, with the fallback stop list retained.
- Reworked the persistent current-location marker to request an initial GPS position first and then continuously update a Google Maps-style blue dot with `watchPosition()`.


## V56 update

- Fixed module editing so existing lecture/tutorial/recitation timings are preserved when saving edits.
- Improved NUSMods lesson import normalization to handle multiple timetable field formats and correctly retain start/end times.
- Added a migration for previously imported lessons that may have stored alternate time fields.


## V57 update

- Fixed the module editor so existing lecture/tutorial/recitation timings remain visible when opening **Edit module**.
- Converted stored timing formats into valid `HH:MM` values for HTML time inputs, preventing the browser from displaying `--:--` for existing lessons.
- Existing timings are preserved when saving the module unless the lesson is intentionally removed.


## V58 update

- Improved the mobile weekly calendar so the **time axis remains pinned to the left** while the timetable can still scroll horizontally.
- Reduced the mobile time-axis width and adjusted its labels so the lesson timings remain visible on narrow screens.


## V59 update — Notifications

- Added a notification centre from the top-right bell button.
- Added task reminders for **7 days before**, **1 day before**, and **overdue** tasks.
- Added one-day reminders for activities.
- Added browser/PWA notifications using the service worker when notification permission is granted.
- Added notification click handling to open the relevant Tasks or Activities page.
- Added reminder de-duplication and a reset reminder history option to prevent repeated alerts.
- Reminder checks run when a page opens, when the app returns to the foreground, and every minute while the app is open.
- Note: true background push while the app is completely closed is not enabled yet; that will require a server-side push system such as Firebase Cloud Messaging.


## V60 update — Notification centre fix

- The notification centre now shows only notifications that are currently due, rather than future scheduled activity reminders.
- Activities on future dates no longer appear in the notification centre prematurely.
- Service-worker cache version updated to V60.


## V61 update — Notification centre timing

- The notification centre now shows reminders that are **due now or scheduled within the next 24 hours**.
- A task due tomorrow or exactly one week later can now appear as an upcoming reminder, without showing activities several days in advance.
- Added a relative countdown such as `In 3 hr` or `Due now` to make reminder timing clearer.


## V62 update — Notification data fix

- Fixed a notification-centre bug where an old/nonexistent task could appear as an overdue notification even though it was not present on the Tasks page.
- The notification centre now uses only the current task/activity notification stream; it no longer separately scans task state for overdue items.
- Added cleanup of stale reminder-log entries when their associated task or activity no longer exists.
- A deleted or nonexistent task can no longer be resurrected as a notification.


## V63 update — Notification and deletion fixes

- Fixed stale/ghost task and activity notifications by adding deletion tombstones that survive Firebase sync races.
- Deleted activities now save to Firestore immediately, matching task deletion behaviour.
- Notifications now display the actual deadline/activity date instead of the reminder date.
- Notification countdowns still show when the reminder is due, while the actual deadline/date is shown separately.
- Cloud state is filtered against recorded deletions so deleted items cannot reappear from an older Firestore snapshot.


## V64 update — Notification centre clarity

- Removed confusing `Due now` / `In X minutes` reminder countdowns from the notification centre.
- The notification centre now displays the actual task deadline or activity date.
- Fixed reminder-stage selection so a task due tomorrow does not show an already-passed 7-day reminder.
- Only the latest relevant reminder stage is displayed for each task/activity.


## V65 update — Background Web Push

- Added standards-based Web Push subscriptions for signed-in users.
- Added a service-worker `push` handler so notifications can be displayed while the PWA is closed.
- Added Firestore storage for per-user push subscriptions.
- Added a GitHub Actions scheduler that checks task/activity reminders every 5 minutes and sends Web Push notifications through VAPID.
- Kept the existing foreground notification checker as a fallback while the app is open.
- Added `PUSH_SETUP.md` with the required VAPID and Firebase service-account setup.
- Added `push-server/` and `.github/workflows/push-reminders.yml` for background reminder delivery.


## V65.1 update — Web Push configuration loading

- Fixed the notification system not detecting the VAPID public key because `push-config.js` was not loaded before `shared.js`.
- Added `push-config.js` to pages that load the shared notification system.
- Bumped the service-worker cache version to V65.1.


## V66 update — Background push testing and diagnostics

- Added a manual GitHub Actions **test notification** mode that sends a Web Push to every registered device.
- GitHub Actions workflow now reports users, subscriptions, reminder candidates, pushes sent/failed, and removed expired subscriptions.
- Increased the normal reminder detection window from 2 minutes to 15 minutes to tolerate GitHub scheduled-run delays.
- The test mode is independent of task/activity deadlines, so it can verify the Web Push pipeline directly.


## V66.1 diagnostics
- Added temporary Firebase/Firestore diagnostics to the push worker so the GitHub Actions log reports the configured project, database, and number of `/users` documents returned.


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


## V67.2 — Duplicate notification fix
- Removed foreground/local reminder delivery from the client.
- Background Web Push via GitHub Actions is now the single source of truth for reminder delivery.
- This prevents one reminder from generating both a server push and a local in-app notification.
- Preserved the Notification Centre display and background push service worker.
- Fixed the workflow YAML `default: false:` typo if present.


## V68 — Automatic cloud sync

- Firestore now listens in real time for changes to the signed-in user's app state.
- Task, activity, module and dashboard pages redraw automatically when another device changes the data.
- Normal edits continue to save automatically to Firestore; the old manual Sync Now workflow is no longer required for routine syncing.
- LocalStorage remains as an offline cache.
- A timestamp guard prevents an older remote snapshot from overwriting a newer local edit while it is being saved.
- The existing Web Push reminder system is unchanged.


## V69 — Activity location search
- Activity locations now use the same search priority as the NUS Map.
- NUSMods venue matches are searched first.
- If no NUSMods venue matches, the search falls back to external maps (Google Places when configured, then OpenStreetMap/Photon).
- Selected location source and coordinates are saved with the activity.
- Existing activity locations remain compatible and can still be edited.

## V70 — Friends
- Added a Friends tab.
- Manual friends can be added with a name and one of the user's lesson groups.
- NUS Companion users can add each other with a private friend code and friend requests.
- Accepted app friends are matched automatically by module, lesson type and class/group number.
- Friend timetable matching reads a dedicated shared timetable only; tasks, activities and other private app data are not exposed.


## V71 — Friends improvements
- Fixed the Friends page friend-code loading race by updating the code after Firebase authentication becomes ready.
- Manual friends can now have multiple shared lessons under one friend.
- Friends are displayed as **friend name → all shared lessons**, rather than creating separate blocks for each lesson.
- Adding another shared lesson to an existing manual friend updates the same friend record instead of creating a duplicate.
- App friends continue to match automatically from shared timetable data.


## V72 — Friends UI and loading fixes
- Waits for Firebase initialization and the first auth-state callback before loading the friend code.
- Fixes the manual shared-lesson checkbox layout so lesson text is fully visible.
- Friends with more than two shared lessons show the first two by default, with View all / Collapse controls.


## V73 — Friends timing and modal fixes
- Friend code is generated and displayed immediately from the Firebase UID; Firestore profile creation runs in the background.
- Cached friend code is shown instantly on repeat visits.
- Firebase auth-state changes update the friend code without requiring a page refresh.
- Fixed the Friends modal X button by actually initializing the shared modal controls.


## V74 — Friends page startup and friend-code persistence fix
- Friends page now initializes the shared app/modal controls, so the top-right X closes the modal.
- Friend code is stored in page state and rendered instead of being reset to `Loading…` whenever the Friends UI re-renders.
- Cached friend code is also preserved across re-renders.


## V75 — Account data isolation
- Switching Firebase accounts now resets the browser's local app state before loading the new account from Firestore.
- A brand-new account starts with clean default modules/tasks/activities rather than inheriting the previous account's data.
- Manual friends and friend-code caches are account-scoped; legacy manual-friend data is migrated only to the account that originally owned the browser's old unscoped data.
- Notification/deletion history is cleared on account switches so it cannot leak between users.


## V76 — Complete account-boundary reset
- Purges all app-data localStorage keys whenever the Firebase account changes or signs out.
- Purges old account-scoped friend-code/manual-friend caches during account switches.
- Handles the case where Firebase restores a signed-in account before the page auth listener is installed.
- Preserves UI-only preferences such as theme and calendar view.
- New accounts are reset to clean defaults before their Firestore state is applied.


## V77 — Stop home-page refresh loop
- Removed the Home page's full `location.reload()` response to realtime data events.
- Prevents the account-isolation reset from triggering an infinite page refresh loop.
- Realtime sync remains enabled; other pages continue to update without full-page reloads.
