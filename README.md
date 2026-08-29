# Weavo

**Live:** https://vorlis08.github.io/weavo/

A calm, dark-mode **calendar that unifies events, tasks, and notes** — and the
links between them. Weavo is a local-first productivity tool: no account, no
server, everything lives in your browser (`localStorage`). Export/import as JSON
to move or back up your data.

## What works

**Capture** — one modal (`C`) for an event, task, or thought, with live
natural-language parsing: `Call plumber tomorrow 9am #home`, `Design review
Thu 2–3pm @alex`, `Ship v2 in 3 days`. `#name` files it under a project
(created on the fly); `@name` attaches a person. Leave anything *unsorted* for
later.

**Relationships** — tasks depend on other tasks (blocked by / blocks), notes
link each other with `[[wiki-links]]` and show backlinks, contacts hang off
events, everything ties to a project.

**Reminders** — time-based or offset-based ("2 hours before due"). A background
engine fires a desktop notification and an in-app toast when one comes due;
snooze or dismiss.

**Smart layer** — live time-conflict detection across the calendar; a
free-slot suggestion on any open task that you can drop straight onto the
calendar.

**Google** — sign in with Google to mirror your Calendar (read-only) and turn
starred emails into tasks/notes, entirely client-side with your own OAuth
Client ID. Setup: [INTEGRATIONS.md](INTEGRATIONS.md). Slack needs a backend and
comes later.

**Installable** — it's a PWA; "Add to home screen" / "Install" works, with
offline access to the app shell.

**Views**

| View | Route | |
| --- | --- | --- |
| Dashboard | `/` | week/day calendar + today, reminders, unsorted, stale rails |
| Calendar | `/calendar` | week and month; click a slot to add |
| Board | `/board` | drag-and-drop kanban; All/Mine and per-project filters |
| Timeline | `/timeline` | per-project lanes over a date axis |
| Notes map | `/notes` | force-directed graph of notes and their links |
| Digest | `/digest` | today / overdue / this week / inbox / deferred / done |
| Triage | `/triage` | fast pass over the unsorted inbox |
| Record detail | `/item/:id` | fully editable |
| Settings | `/settings` | name, week/day hours, projects, people, data |

**Keyboard** — `C` capture · `⌘/Ctrl-K` command palette · `G` then
`D`/`C`/`B`/`T`/`N` to jump between views · `?` for the full list.

**Learn it** — an in-app [`/guide`](https://vorlis08.github.io/weavo/guide) with a
live quick-capture playground, plus a short coach-mark **tour** that walks over
the real UI (offered on first run, replayable from Settings or `⌘K`).

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) — theme tokens in `src/index.css`
- [React Router](https://reactrouter.com/) · [Zustand](https://zustand.docs.pmnd.rs/) (persisted) · [@dnd-kit](https://dndkit.com/) · [lucide-react](https://lucide.dev/)
- Self-hosted Hanken Grotesk + JetBrains Mono

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run deploy   # build + publish dist to the gh-pages branch
```

Deploy is manual (`npm run deploy`, via the `gh-pages` package) — the auth
token used here lacks the `workflow` scope, so there is no GitHub Actions
pipeline yet. `dist/404.html` is a copy of `index.html` so client-side routes
survive a hard refresh.

## Layout

```
src/
  components/   shell, sidebar, quick-capture, command palette, week grid,
                inline editors, shared UI primitives
  views/        Dashboard, CalendarView, Board, Timeline, NotesMap, Digest,
                Triage, ProjectView, RecordDetail, SettingsView
  lib/          types, store (zustand + persist), date/parse/selectors utils,
                sample data
  hooks/        useReminderEngine
```
