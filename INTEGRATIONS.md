# Connecting Google (Calendar + Gmail)

Weavo talks to Google **entirely from your browser** — there is no server and no
shared secret. You create your own OAuth client once and paste its **Client ID**
(which is public, safe to expose) into Settings.

Access is **read-only**: `calendar.readonly` + `gmail.readonly`. Weavo never
writes to your Google account.

## One-time setup (~5 minutes)

1. **Create a project** — <https://console.cloud.google.com/> → project picker →
   *New project* → name it `Weavo`.

2. **Enable the APIs** — *APIs & Services → Library*, enable:
   - **Google Calendar API**
   - **Gmail API**

3. **OAuth consent screen** — *APIs & Services → OAuth consent screen*:
   - User type: **External**, then *Create*
   - App name `Weavo`, your email for support + developer contact
   - *Scopes* → *Add or remove scopes* → tick
     `.../auth/calendar.readonly` and `.../auth/gmail.readonly` → *Update*
   - *Test users* → add your own Google address
   - Save. Leaving it in **Testing** is fine (up to 100 users, no verification).

4. **Create the Client ID** — *APIs & Services → Credentials → Create
   credentials → OAuth client ID*:
   - Application type: **Web application**
   - **Authorised JavaScript origins** → *Add URI* for each:
     - `https://vorlis08.github.io`
     - `http://localhost:5173` (only if you run it locally)
   - Leave *Authorised redirect URIs* empty
   - *Create* → copy the **Client ID** (`…apps.googleusercontent.com`)

5. **In Weavo** → *Settings → Integrations* → paste the Client ID →
   **Connect Google**.
   - You will see *"Google hasn't verified this app"* — that is normal for a
     personal, unverified app. Click *Advanced → Go to Weavo (unsafe)* and
     continue.
   - Approve the read-only Calendar + Gmail access.

## After connecting

- **Calendar** — your primary calendar (−7 to +45 days) is mirrored into Weavo
  and refreshed every 5 minutes and on demand (*Sync calendar now*). Mirrored
  events are read-only in Weavo; edit them in Google Calendar.
- **Mail** — a *Mail* item appears in the sidebar. It lists messages matching
  the Gmail search from Settings (default `is:starred`); each can become a task
  or a note with one click. Try `is:starred`, `label:follow-up`,
  `is:important newer_than:7d`.

## Notifications

*Settings → Reminders → Enable* asks the browser for notification permission.
Reminders then pop up (desktop + in-app) while a Weavo tab is open. Push when
the tab is closed needs a backend and is not built yet.

## Not yet

- **Slack** — the Slack API can't be called from a browser, so it needs a small
  backend. Planned for a later phase.
- **Two-way calendar sync**, Google Drive, cross-device sync — later.
