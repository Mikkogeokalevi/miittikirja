# MK Miittikirja – Developer Guide

## Overview
MK Miittikirja is a single-page web app that uses **Firebase Auth** and **Firebase Realtime Database**. It supports:

- Admin login and event management
- Guestbook per event (attendees/logs)
- Visitor QR view for signing the guestbook (no login)
- Stats (charts + map)
- Calendar import from geocache.fi CSV (.csv/.srv)

The UI is defined in `index.html` with multiple view sections shown/hidden by JavaScript.

## Project structure

- `index.html`
  - All view containers (login/admin/user/guestbook/visitor/stats)
  - Loads external libs (Firebase compat, Chart.js, Leaflet, qrcodejs)
  - Loads local scripts in this order:
    - `messages.js`
    - `visitor.js`
    - `app.js`
    - `stats.js`
    - `calendar.js`

- `style.css`
  - Themes and shared components
  - Layout, responsive rules, animations

- `app.js`
  - Firebase initialization
  - Auth state handling + switching between main views
  - Admin/user event lists
  - Guestbook view (attendee list)
  - Host-side QR generation
  - Confetti/special effects
  - Wake Lock (screen-on) logic

- `visitor.js`
  - Visitor (QR) signing flow
  - Translations (FI/EN/SV/ET)
  - Expiry handling (QR valid 3 days)
  - Visitor modal/feedback
  - Uses `window.MK_Messages` for rank titles and greetings

- `messages.js`
  - Rank titles + greetings + streak/missed messages
  - Safe place to add “personality” without touching Firebase

- `stats.js`
  - Loads events/logs and computes statistics
  - Chart.js graphs + Leaflet map

- `calendar.js`
  - Loads/saves calendar data in Firebase
  - Imports geocache.fi CSV and filters miitti events
  - Renders calendar + legend and stores `lastImportDate`

- `manifest.json`
  - PWA manifest for “add to home screen”

- `config.js`
  - Contains `MK_Config.HOST_UID` and version, but current `app.js` also has a built-in `HOST_UID`.

## Views (index.html)

- `#login-view`
  - Admin login via email/password

- `#admin-view`
  - Admin tools (add/edit/archive/delete events)

- `#user-view`
  - Alternate “miittikirja” mode (non-admin style list)

- `#guestbook-view`
  - Single event page (attendee list + tools)

- `#visitor-view`
  - Visitor QR sign-in form (nickname/from/message)

- `#stats-view`
  - Tabs: lists, graphs, map, calendar

## Firebase data model

Base path: `miitit/{uid}/...`

- `miitit/{uid}/events/{eventId}`
  - Event metadata
  - Typical fields: `type`, `gc`, `name`, `date`, `time`, `coords`, `location`, `descriptionHtml`, `isArchived`

- `miitit/{uid}/logs/{eventId}/{logId}`
  - Individual visitor log entries
  - Fields: `nickname`, `from`, `message`, `timestamp`

- `miitit/{uid}/calendar`
  - Calendar import output
  - Fields: `finds`, `totalFinds`, `years`, `events`, `lastImportDate`

## Boot / routing logic

- On window load, `app.js` checks URL parameters:
  - If `?event=...` exists, visitor mode is enabled and the visitor view is shown.

- Auth flow:
  - `auth.onAuthStateChanged(...)` swaps login vs admin/user views.

## Key user actions mapping

### Admin login
- Button: `#btn-email-login`
- Code: `auth.signInWithEmailAndPassword(email, password)` in `app.js`

### Load events lists
- Code: `loadEvents()` in `app.js`
- Reads: `miitit/{currentUser.uid}/events`

### Open guestbook for an event
- Code: `window.openGuestbook(eventKey)` in `app.js`
- Reads event: `miitit/{uid}/events/{eventKey}`
- Subscribes logs: `miitit/{uid}/logs/{eventKey}`

### Visitor QR sign-in
- Button: `#btn-visitor-sign` calls `handleVisitorSign()`
- Code: `window.handleVisitorSign = async function() { ... }` in `visitor.js`
- Writes log: `miitit/{targetHost}/logs/{eventId}`

### Stats
- Code: `initStats()` in `stats.js`
- Reads: events + logs

### Calendar import
- Code: `initCalendar()`, `importSrvFile()`, `parseSrvContent()` in `calendar.js`
- Saves: `miitit/{uid}/calendar`

## Testing checklist

- Admin login works
- Admin view loads event lists
- Guestbook view shows attendee list and live updates
- QR link works: `index.html?event=<EVENT_ID>&uid=<UID>`
- Visitor can sign once, duplicate detection works
- Stats loads without console errors
- Calendar import works and filters correctly
