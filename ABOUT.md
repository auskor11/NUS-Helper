# About NUS Companion

NUS Companion is a personal NUS student PWA designed to bring everyday university information into one dashboard.

### Built for

- Module planning
- Weekly timetables
- Club/CCA activities
- Assignment deadlines
- Campus navigation
- Cross-device access

### Technology

HTML, CSS and JavaScript · PWA · Firebase Authentication · Firebase Firestore · Firebase Hosting · Leaflet · NUSMods API · NUS Campus Map · OpenStreetMap

### Project status

Personal student project, actively developed throughout the semester.

### Disclaimer

Independent project. Not affiliated with or endorsed by NUS or NUSMods.


### V21
Restores the complete NUSMods-first venue search and adds a timeout-protected Google Places fallback. A missing/unavailable Google API no longer blocks normal NUS venue searches.


### V22

V22 improves the map and editing workflows: NUS shuttle stops have red bus markers, module editing can import lesson groups directly from NUSMods, and activities can now be edited after creation.
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


## Current version

**V50**

### What the app does

NUS Companion brings common NUS student workflows into one mobile-friendly dashboard:

- timetable and calendar planning
- module and lesson-group management
- activity tracking
- task/deadline management
- NUS campus map and location search
- NUS shuttle bus information
- current-device location
- navigation to campus locations
- Firebase authentication and cross-device cloud sync

### Version 50 fixes

- Restored the visible red current-time line on the weekly calendar.
- Made task deletion persist immediately to Firestore when the user is signed in, while continuing to save locally.
- Updated the project documentation for GitHub.

### Disclaimer

NUS Companion is an independent personal project. It is not affiliated with, endorsed by, or operated by NUS, NUSMods, Citymapper, or other third-party services referenced by the app.


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
