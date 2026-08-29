# Weavo

A calm, dark-mode **calendar that unifies events, tasks, and notes** — and the
links between them. Weavo is a productivity tool built around four ideas:

1. **Capture anything, fast** — one modal for an event, a task, or a stray
   thought, with the option to leave it *unsorted* for later triage.
2. **Relationships are first-class** — tasks depend on other tasks, notes
   backlink each other, contacts hang off events, everything ties to a project.
3. **Reminders that think** — context triggers (not just clock time),
   escalation when ignored, a daily / weekly digest.
4. **Many views of one dataset** — calendar, kanban, timeline, a notes graph,
   and a digest.

This repository is the **front-end**, implemented from the approved design.
Integrations (Gmail, Slack, Notion, Google Drive / Calendar) are represented
visually; there is no backend yet — all data lives in `src/lib/mockData.ts`.

## Screens implemented

| View | Route | Status |
| --- | --- | --- |
| Dashboard (week calendar + today / reminders / unsorted rail) | `/` | ✅ |
| Record detail (task with dependencies, backlinks, reminders) | `/item/:id` | ✅ |
| Kanban board | `/kanban` | ✅ |
| Quick capture (modal, `C` to open) | — | ✅ |
| Calendar · Timeline · Notes map · Digest | `/calendar` … | placeholder |

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) (theme tokens in `src/index.css`)
- [React Router](https://reactrouter.com/) for view routing
- [Zustand](https://zustand.docs.pmnd.rs/) for the small amount of shared UI state
- [lucide-react](https://lucide.dev/) icons, self-hosted Hanken Grotesk + JetBrains Mono

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Project layout

```
src/
  components/     shell, sidebar, quick-capture, shared UI primitives
  views/          Dashboard, Kanban, RecordDetail, Placeholder
    dashboard/    WeekCalendar
  lib/            types, mock data, zustand store, nav config
```

## Design tokens

The whole palette is defined once as CSS custom properties in
`src/index.css` (`@theme`) and consumed through Tailwind utilities
(`bg-surface`, `text-ink-2`, `border-line`, `text-iris`, …). One accent
(iris) carries interaction; a warm amber is reserved for reminders and
escalation; rose flags conflicts; sage marks done / focus.
