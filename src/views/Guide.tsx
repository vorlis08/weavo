import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Columns3,
  Command,
  FileText,
  GanttChartSquare,
  Inbox,
  LayoutGrid,
  ListChecks,
  Mail,
  Network,
  Sparkles,
  Sunrise,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, SectionLabel, cn } from '@/components/ui'
import { CapturePlayground } from '@/components/CapturePlayground'
import { useStore } from '@/lib/store'
import { makeSampleData } from '@/lib/sampleData'

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="border-t border-line py-9 first:border-0 first:pt-2">
      <SectionLabel className="mb-2.5">{eyebrow}</SectionLabel>
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-balance">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-2 [&_a]:text-iris-2 [&_a:hover]:underline [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}

const Tok = ({ children, tone = 'iris' }: { children: ReactNode; tone?: 'iris' | 'sage' | 'amber' }) => (
  <span
    className={cn(
      'mono rounded px-1.5 py-0.5 text-[0.85em]',
      tone === 'iris' && 'bg-iris/14 text-iris-2',
      tone === 'sage' && 'bg-sage/14 text-sage',
      tone === 'amber' && 'bg-amber/14 text-amber',
    )}
  >
    {children}
  </span>
)

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="mono rounded border border-line-2 border-b-2 bg-surface-3 px-1.5 py-px text-[0.82em] text-ink">
    {children}
  </kbd>
)

const VIEWS: { icon: typeof LayoutGrid; name: string; to: string; blurb: string }[] = [
  { icon: LayoutGrid, name: 'Dashboard', to: '/', blurb: 'The week as a calendar plus a rail: due today and overdue, live reminders, your unsorted inbox, and stale tasks. Click an empty slot to add an event.' },
  { icon: CalendarDays, name: 'Calendar', to: '/calendar', blurb: 'A fuller calendar with Week and Month modes.' },
  { icon: Columns3, name: 'Board', to: '/board', blurb: 'Kanban: Unsorted → To do → In progress → Blocked → Done. Drag a card to change its status.' },
  { icon: GanttChartSquare, name: 'Timeline', to: '/timeline', blurb: 'One lane per project across a date axis. Tasks as bars, events as dots.' },
  { icon: Network, name: 'Notes map', to: '/notes', blurb: 'Every note a node, every [[link]] an edge. Hover to light up neighbours, click to open.' },
  { icon: Sunrise, name: 'Digest', to: '/digest', blurb: 'A written rollup: on the calendar today, overdue, due today, coming up, waiting, deferred, done.' },
  { icon: Inbox, name: 'Unsorted', to: '/triage', blurb: 'The triage list — give each item a project, open it, file it, or delete it.' },
]

export function Guide() {
  const startTour = useStore((s) => s.startTour)
  const replaceAll = useStore((s) => s.replaceAll)
  const itemCount = useStore((s) => Object.keys(s.data.items).length)
  const toast = useStore((s) => s.toast)

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">Guide</h1>
        <a
          href="https://github.com/vorlis08/weavo"
          target="_blank"
          rel="noreferrer"
          className="mono ml-auto text-[11px] text-ink-3 hover:text-ink-2"
        >
          source
        </a>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[760px]">
          <section className="pb-4">
            <SectionLabel className="mb-2.5">What Weavo is</SectionLabel>
            <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-balance">
              One place for events, tasks, and notes — and the links between them.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Capture first, sort later — or never. Everything can point at everything else: a
              task to its project, a task to the one it’s waiting on, a note to another note.
              Weavo runs entirely in your browser; there’s no account and no server, and your
              data never leaves this device.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent" onClick={startTour}>
                <Sparkles size={13} />
                Take the 40-second tour
              </Button>
              {itemCount === 0 && (
                <Button
                  onClick={() => {
                    replaceAll(makeSampleData())
                    toast('Example data loaded')
                  }}
                >
                  Load example data
                </Button>
              )}
            </div>
          </section>

          <Section id="capture" eyebrow="The fast way in" title="Quick capture">
            <p>
              Press <Kbd>C</Kbd> anywhere. Type one plain sentence and Weavo pulls the
              structure out of it — the date, the <Tok tone="sage">#project</Tok>, the{' '}
              <Tok tone="amber">@person</Tok>. Edit the text below and watch it work:
            </p>
            <CapturePlayground />
            <p>
              For a <strong>task</strong>, a detected time becomes the due date; for an{' '}
              <strong>event</strong>, the start. <Kbd>Enter</Kbd> captures,{' '}
              <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> adds a line break.{' '}
              <strong>Leave unsorted</strong> drops it in the inbox instead of filing it now;{' '}
              <strong>Add details</strong> creates it and opens it.
            </p>
          </Section>

          <Section id="records" eyebrow="The building blocks" title="Three kinds of record">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: CalendarDays, name: 'Event', tone: 'sage', body: 'A start and end time (or all-day). Shows on the calendar. Can carry the people attending.' },
                { icon: ListChecks, name: 'Task', tone: 'iris', body: 'A status (To do, In progress, Blocked, Done), a due date, an assignee, a checklist, and dependencies.' },
                { icon: FileText, name: 'Note', tone: 'ink', body: 'Free text. Link it to any record with [[its title]] — the other record then shows a backlink.' },
              ].map((r) => (
                <div key={r.name} className="rounded-xl border border-line bg-surface p-4">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      r.tone === 'sage' && 'bg-sage/14 text-sage',
                      r.tone === 'iris' && 'bg-iris/14 text-iris-2',
                      r.tone === 'ink' && 'bg-surface-3 text-ink-2',
                    )}
                  >
                    <r.icon size={16} strokeWidth={1.6} />
                  </span>
                  <div className="mt-2.5 text-[14px] font-medium text-ink">{r.name}</div>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{r.body}</p>
                </div>
              ))}
            </div>
            <p>
              They share the same fields and you can convert one into another any time from the
              record’s <span className="mono">···</span> menu. An item marked{' '}
              <strong>unsorted</strong> is one you haven’t filed — it waits in the Unsorted
              inbox and the Board’s first column.
            </p>
          </Section>

          <Section id="views" eyebrow="Getting around" title="The views">
            <p>The sidebar switches between ways of seeing the same records.</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {VIEWS.map((v) => (
                <Link
                  key={v.name}
                  to={v.to}
                  className="group rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
                >
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <v.icon size={15} strokeWidth={1.6} className="text-ink-3 group-hover:text-iris-2" />
                    {v.name}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-ink-2">{v.blurb}</p>
                </Link>
              ))}
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <Mail size={15} strokeWidth={1.6} className="text-ink-3" />
                  Mail
                </div>
                <p className="mt-1 text-[12px] leading-snug text-ink-2">
                  Appears once Google is connected — Gmail messages you can turn into tasks or
                  notes. See <a href="#google">Google</a>.
                </p>
              </div>
            </div>
          </Section>

          <Section id="detail" eyebrow="The record itself" title="Opening a record">
            <p>
              Click any item to open it. Everything is edited in place — click the title to
              rename, click the description to write. No edit mode, no save button.
            </p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-ink-3">
              <li>
                <strong>Description</strong> with <Tok>[[links]]</Tok> to other records.
              </li>
              <li>
                <strong>Checklist</strong> — sub-items to tick off; the count shows on the card.
              </li>
              <li>
                <strong>Dependencies</strong> — <em>Blocked by</em> and <em>Blocks</em> (the
                other side fills itself in). An open blocker flags the task everywhere.
              </li>
              <li>
                <strong>Reminders</strong> — offsets before it’s due, or a specific time.
              </li>
              <li>
                <strong>Free slot</strong> — for an open task, Weavo finds the next gap in your
                working hours and offers to put it on the calendar.
              </li>
            </ul>
          </Section>

          <Section id="google" eyebrow="Connected" title="Google">
            <p>
              In <Link to="/settings">Settings → Integrations</Link>, paste your Google OAuth
              Client ID and connect. It runs client-side and asks for <strong>read-only</strong>{' '}
              access — Weavo never writes to your Google account. Full setup steps are in{' '}
              <span className="mono">INTEGRATIONS.md</span>.
            </p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-ink-3">
              <li>
                <strong>Calendar</strong> — your primary calendar (−7 to +45 days) is mirrored
                in, refreshed every 5 minutes and on demand. Mirrored events are read-only here.
              </li>
              <li>
                <strong>Gmail</strong> — the Mail view lists messages matching your search
                (default <span className="mono">is:starred</span>); each becomes a task or note
                with a link back to the thread.
              </li>
            </ul>
            <p>Items from Google wear a small source badge so you always know where they came from.</p>
          </Section>

          <Section id="reminders" eyebrow="Being nudged" title="Reminders &amp; notifications">
            <p>
              Add a reminder from any task or event. Weavo checks every 30 seconds; when one
              comes due it raises a <strong>desktop notification</strong> (click it to open the
              record) and an in-app toast, and the reminder jumps to the top of the Dashboard
              rail with <strong>Snooze</strong> and <strong>Dismiss</strong>.
            </p>
            <p>
              Turn notifications on in <Link to="/settings">Settings → Reminders</Link>.{' '}
              <strong>They only fire while a Weavo tab is open</strong> — push when the app is
              fully closed needs a server, which isn’t built yet.
            </p>
          </Section>

          <Section id="keys" eyebrow="Faster" title="Keyboard">
            <div className="overflow-hidden rounded-xl border border-line">
              {[
                [<Kbd key="c">C</Kbd>, 'Quick capture'],
                [<span key="k"><Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></span>, 'Command palette — search everything, jump anywhere'],
                [<span key="g"><Kbd>G</Kbd> then <Kbd>D</Kbd>/<Kbd>C</Kbd>/<Kbd>B</Kbd>/<Kbd>T</Kbd>/<Kbd>N</Kbd></span>, 'Go to Dashboard / Calendar / Board / Timeline / Notes map'],
                [<Kbd key="q">?</Kbd>, 'Show the shortcut list'],
                [<Kbd key="e">Esc</Kbd>, 'Close a dialog or the capture panel'],
              ].map(([k, label], i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-4 px-4 py-2.5 text-[13px]',
                    i > 0 && 'border-t border-line',
                  )}
                >
                  <span className="w-[190px] shrink-0">{k as ReactNode}</span>
                  <span className="text-ink-2">{label as ReactNode}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="data" eyebrow="Where it lives" title="Your data">
            <p>
              Everything is stored in this browser. It’s private and works offline, but it’s
              tied to this device — no cross-device sync yet. In{' '}
              <Link to="/settings">Settings → Your data</Link> you can <strong>Export</strong>{' '}
              and <strong>Import</strong> a JSON file, <strong>Load example</strong> data, or{' '}
              <strong>Clear all</strong>.
            </p>
          </Section>

          <Section id="day" eyebrow="Putting it together" title="A typical day">
            <ol className="ml-4 list-decimal space-y-2 marker:text-ink-3 marker:[font-family:var(--font-mono)]">
              <li>
                <strong>Through the day</strong> — hit <Kbd>C</Kbd> and dump things in. Don’t
                stop to file them; leave them unsorted if you’re moving fast.
              </li>
              <li>
                <strong>Once a day</strong> — open <Link to="/triage">Unsorted</Link> (or read
                the <Link to="/digest">Digest</Link>) and clear the inbox.
              </li>
              <li>
                <strong>While working</strong> — live in the <Link to="/">Dashboard</Link> or
                the <Link to="/board">Board</Link>; drag cards as things move.
              </li>
              <li>
                <strong>Once a week</strong> — scan the <Link to="/digest">Digest</Link> for
                what’s overdue, coming, and gone quiet.
              </li>
            </ol>
          </Section>

          <Section id="later" eyebrow="On the roadmap" title="Not yet">
            <ul className="ml-4 list-disc space-y-1.5 marker:text-ink-3">
              <li><strong>Slack</strong> — needs a small backend; next phase.</li>
              <li><strong>Push notifications</strong> when no tab is open — also needs a backend.</li>
              <li><strong>Writing to Google Calendar</strong> — currently read-only.</li>
              <li><strong>Cross-device sync</strong> — use Export / Import for now.</li>
            </ul>
          </Section>

          <div className="flex items-center gap-3 border-t border-line py-8 text-[12px] text-ink-3">
            <Command size={14} />
            Press <Kbd>?</Kbd> any time for shortcuts, or come back here from the sidebar.
            <Button variant="ghost" className="ml-auto" onClick={startTour}>
              <Sparkles size={13} />
              Replay tour
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
