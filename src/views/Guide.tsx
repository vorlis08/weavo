import { type ReactNode } from 'react'
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
import { Page } from '@/components/Page'
import { Button, SectionLabel, cn } from '@/components/ui'
import { CapturePlayground } from '@/components/CapturePlayground'
import { useStore } from '@/lib/store'
import { useT, useLang } from '@/lib/i18n'
import { makeSampleData } from '@/lib/sampleData'

/** minimal inline markdown: `code`, **bold**, [label](/route) */
function MD({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<code key={i} className="mono rounded bg-iris/14 px-1.5 py-0.5 text-[0.85em] text-iris-2">{m[1]}</code>)
    else if (m[2]) out.push(<strong key={i} className="font-medium text-ink">{m[2]}</strong>)
    else if (m[3]) out.push(
      m[4].startsWith('/') ? (
        <Link key={i} to={m[4]} className="text-iris-2 hover:underline">{m[3]}</Link>
      ) : (
        <a key={i} href={m[4]} className="text-iris-2 hover:underline">{m[3]}</a>
      ),
    )
    last = m.index + m[0].length
    i += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="mono rounded border border-line-2 border-b-2 bg-surface-3 px-1.5 py-px text-[0.82em] text-ink">
    {children}
  </kbd>
)

interface Sec {
  id: string
  eyebrow: string
  title: string
  paras?: string[]
  bullets?: string[]
  ol?: string[]
  node?: 'capture' | 'records' | 'views' | 'keys'
}

interface GuideContent {
  what: string
  headline: string
  intro: string
  takeTour: string
  loadExample: string
  exampleToast: string
  recordKinds: { name: string; body: string }[]
  viewBlurbs: Record<string, string>
  mailBlurb: string
  seeGoogle: string
  keyLabels: string[]
  footer: string
  replay: string
  sections: Sec[]
}

const CS: GuideContent = {
  what: 'Co je Weavo',
  headline: 'Jedno místo pro události, úkoly a poznámky a vazby mezi nimi.',
  intro:
    'Nejdřív zapiš, roztřídit můžeš později. Záznamy na sebe mohou odkazovat: úkol na projekt, poznámka na jinou poznámku. Weavo běží celé v prohlížeči, bez účtu a bez serveru, data neopouštějí toto zařízení.',
  takeTour: 'Spustit prohlídku (40 s)',
  loadExample: 'Načíst ukázková data',
  exampleToast: 'Ukázková data jsou načtena',
  recordKinds: [
    { name: 'Událost', body: 'Začátek a konec (nebo celý den), volitelně místo a odkaz na schůzku. Zobrazuje se v kalendáři a může se opakovat.' },
    { name: 'Úkol', body: 'Termín (volitelně s časem), stav, priorita, kroky, opakování a připomenutí. Po dokončení opakovaného úkolu vznikne další výskyt.' },
    { name: 'Poznámka', body: 'Volný text, volitelně s datem (pak je vidět v kalendáři). Pomocí [[název]] ji propojíš s jiným záznamem, ten pak zobrazí zpětný odkaz.' },
  ],
  viewBlurbs: {
    home: 'Úvodní stránka: průběh dneška, co hoří, program dne, další úkoly, na koho čekáš a blížící se termíny projektů.',
    todo: 'Denní seznam úkolů ve dvou oddělených částech: Osobní (podle štítků) a Pracovní (hoří, dnes, týden, čeká na odpověď). Zobrazení Seznam nebo Kanban.',
    calendar: 'Týden a měsíc, osobní i pracovní události dohromady, včetně opakovaných. Filtr Vše / Osobní / Práce.',
    projects: 'Projekty rozdělené na osobní a pracovní, každý s fázemi, dalším krokem a vlastní stránkou.',
    reflection: 'Večerní zápis s náladou a automatickým shrnutím dne. Na druhé záložce jsou dlouhodobé cíle.',
    timeline: 'Jedna řada na projekt na časové ose. Úkoly jako pruhy, události jako body. (pod „Další“)',
    notes: 'Každá poznámka je uzel, každý [[odkaz]] spojnice. Najetím myší zvýrazníš sousední poznámky. (pod „Další“)',
    unsorted: 'Položky k roztřídění: každé přiřaď projekt, otevři ji, zařaď, nebo ji smaž. Zobrazí se, jen když něco čeká.',
  },
  mailBlurb:
    'Zobrazí se po připojení Googlu: zprávy z Gmailu, ze kterých uděláš úkol nebo poznámku. Viz Google níže.',
  seeGoogle: 'Google',
  keyLabels: [
    'Nový záznam',
    'Hledání: najdeš cokoli a přejdeš kamkoli',
    'Přejít na Přehled / Kalendář / Nástěnku / Časovou osu / Mapu poznámek',
    'Zobrazit seznam zkratek',
    'Zavřít okno nebo panel',
  ],
  footer: 'Klávesou ? zobrazíš zkratky. Nápovědu najdeš i v postranním panelu.',
  replay: 'Spustit prohlídku znovu',
  sections: [
    {
      id: 'capture',
      eyebrow: 'Nejrychlejší cesta dovnitř',
      title: 'Nový záznam',
      node: 'capture',
      paras: [
        'Kdekoli stiskni `C`. Napiš jednu větu a Weavo z ní vyčte datum, čas, opakování, `#štítek` nebo `#projekt` a `!` (hoří). Vyplní jimi pole v okně. Zkus to níže:',
        'U **úkolu** se rozpoznaný čas stane termínem, u **události** začátkem. Pole, která upravíš ručně, už se z věty nepřepisují. `Enter` nebo `Ctrl+Enter` záznam uloží, **Uložit a další** nechá okno otevřené. **Nechat v doručených** záznam uloží k pozdějšímu roztřídění.',
      ],
    },
    {
      id: 'records',
      eyebrow: 'Stavební kameny',
      title: 'Tři typy záznamů',
      node: 'records',
      paras: [
        'Typ záznamu můžeš kdykoli změnit v jeho panelu. Položka v **doručených** je ta, kterou jsi ještě nezařadil. Čeká v seznamu Doručené a v prvním sloupci nástěnky.',
      ],
    },
    {
      id: 'views',
      eyebrow: 'Orientace',
      title: 'Stránky',
      node: 'views',
      paras: ['Postranní panel přepíná mezi způsoby, jak se dívat na stejné záznamy.'],
    },
    {
      id: 'detail',
      eyebrow: 'Samotný záznam',
      title: 'Panel záznamu',
      paras: [
        'Klikni na úkol, událost nebo poznámku a otevře se panel se všemi poli. Změny se ukládají hned, tlačítko Uložit není potřeba.',
      ],
      bullets: [
        '**Termín, čas a opakování** — denně, ve všední dny, týdně ve vybrané dny, měsíčně nebo ročně, případně každých N a do zvoleného data.',
        '**Připomenutí** — může jich být víc: před termínem, v čas termínu, v den termínu v určitou hodinu nebo v konkrétní čas.',
        '**Kroky** — dílčí body k odškrtnutí; počet se zobrazí u úkolu.',
        '**Poznámka** s `[[odkazy]]` na jiné záznamy.',
        '**Celá stránka** — tlačítko vpravo nahoře otevře záznam na celé stránce se závislostmi a volnými termíny.',
      ],
    },
    {
      id: 'google',
      eyebrow: 'Propojení',
      title: 'Google',
      paras: [
        'V [Nastavení → Integrace](/settings) vlož svůj Google OAuth Client ID a připoj účet. Vše běží v prohlížeči a přístup je **jen pro čtení**, Weavo do Google účtu nezapisuje. Celý postup je v `INTEGRATIONS.md`.',
      ],
      bullets: [
        '**Kalendář** — hlavní kalendář (−7 až +45 dní) se načítá do Weava, obnovuje se každých 5 minut i na vyžádání. Načtené události jsou jen pro čtení.',
        '**Gmail** — stránka Pošta vypíše zprávy podle tvého dotazu (výchozí `is:starred`); z každé uděláš úkol nebo poznámku s odkazem na zprávu.',
      ],
    },
    {
      id: 'reminders',
      eyebrow: 'Připomenutí',
      title: 'Připomenutí a oznámení',
      paras: [
        'Nová událost s časem dostane připomenutí 5 minut předem, úkol s časem v čas termínu a úkol jen s datem v 9:00 v den termínu. Výchozí hodnoty změníš v [Nastavení → Připomenutí](/settings), u každého záznamu je jde upravit. Weavo kontroluje připomenutí každých 30 sekund a při nastaném čase zobrazí **oznámení na ploše** (kliknutím se otevře záznam) i zprávu v aplikaci.',
        'Oznámení zapneš v [Nastavení → Připomenutí](/settings). **Fungují jen při otevřené kartě Weava.** Oznámení při zavřené aplikaci potřebuje server, ten zatím není.',
      ],
    },
    {
      id: 'keys',
      eyebrow: 'Rychleji',
      title: 'Klávesové zkratky',
      node: 'keys',
    },
    {
      id: 'data',
      eyebrow: 'Kde to bydlí',
      title: 'Tvoje data',
      paras: [
        'Vše je uložené v tomto prohlížeči. Data jsou soukromá a fungují offline, ale jsou vázaná na toto zařízení, synchronizace mezi zařízeními zatím není. V [Nastavení → Tvoje data](/settings) můžeš JSON **exportovat** a **importovat**, **načíst ukázku** nebo **vymazat vše**.',
      ],
    },
    {
      id: 'day',
      eyebrow: 'Dohromady',
      title: 'Typický den',
      ol: [
        '**Přes den** — stiskni `C` a zapisuj. Netřiď hned, spěcháš-li, nech záznam v doručených.',
        '**Ráno** — otevři [Přehled](/) a podívej se, co hoří a co je na dnes.',
        '**Při práci** — používej [Úkoly](/todo); osobní a [pracovní](/todo/work) seznam přepínáš v nadpisu. Co hoří, označ plamenem.',
        '**Večer** — zapiš den do [Deníku](/reflection) a nedodělky přesuň na zítra.',
      ],
    },
    {
      id: 'later',
      eyebrow: 'Na plánu',
      title: 'Co zatím není',
      bullets: [
        '**Slack** — potřebuje malý server, přijde později.',
        '**Oznámení při zavřené kartě** — také potřebují server.',
        '**Zápis do Google Kalendáře** — zatím jen čtení.',
        '**Synchronizace mezi zařízeními** — zatím přes Export a Import.',
      ],
    },
  ],
}

const EN: GuideContent = {
  what: 'What Weavo is',
  headline: 'One place for events, tasks, and notes — and the links between them.',
  intro:
    'Capture first, sort later — or never. Everything can point at everything else: a task to its project, a task to the one it’s waiting on, a note to another note. Weavo runs entirely in your browser; there’s no account and no server, and your data never leaves this device.',
  takeTour: 'Take the 40-second tour',
  loadExample: 'Load example data',
  exampleToast: 'Example data loaded',
  recordKinds: [
    { name: 'Event', body: 'A start and end time (or all-day). Shows on the calendar. Can carry the people attending.' },
    { name: 'Task', body: 'A status (To do, In progress, Blocked, Done), a due date, an assignee, a checklist, and dependencies.' },
    { name: 'Note', body: 'Free text. Link it to any record with [[its title]] — the other record then shows a backlink.' },
  ],
  viewBlurbs: {
    home: 'The start screen: today’s progress, what is on fire, today’s schedule, what is next, who you are waiting on, and upcoming project deadlines.',
    todo: 'The daily checklist as two separate lists — Personal (by tag) and Work (on fire, today, this week, waiting). List / Kanban switch.',
    calendar: 'Week and month, personal and work events together. All / Personal / Work filter.',
    projects: 'Projects split into personal and work, each with its own page.',
    reflection: 'An evening journal with mood and an automatic day summary. Long-term Goals on the second tab.',
    timeline: 'One lane per project across a date axis. Tasks as bars, events as dots. (under “More”)',
    notes: 'Every note a node, every [[link]] an edge. Hover to light up neighbours. (under “More”)',
    unsorted: 'The triage list — give each item a project, open it, file it, or delete it. Shows up only when something is waiting.',
  },
  mailBlurb: 'Appears once Google is connected — Gmail messages you can turn into tasks or notes. See Google below.',
  seeGoogle: 'Google',
  keyLabels: [
    'Quick capture',
    'Command palette — search everything, jump anywhere',
    'Go to Dashboard / Calendar / Board / Timeline / Notes map',
    'Show the shortcut list',
    'Close a dialog or the capture panel',
  ],
  footer: 'Press ? any time for shortcuts, or come back here from the sidebar.',
  replay: 'Replay tour',
  sections: [
    {
      id: 'capture',
      eyebrow: 'The fast way in',
      title: 'Quick capture',
      node: 'capture',
      paras: [
        'Press `C` anywhere. Type one plain sentence and Weavo pulls the structure out of it — the date, the `#project`, the `@person`. Edit the text below and watch it work:',
        'For a **task**, a detected time becomes the due date; for an **event**, the start. `Enter` captures, `Shift+Enter` adds a line break. **Leave unsorted** drops it in the inbox instead of filing it now; **Add details** creates it and opens it.',
      ],
    },
    {
      id: 'records',
      eyebrow: 'The building blocks',
      title: 'Three kinds of record',
      node: 'records',
      paras: [
        'They share the same fields and you can convert one into another any time from the record’s `···` menu. An item marked **unsorted** is one you haven’t filed — it waits in the Unsorted inbox and the Board’s first column.',
      ],
    },
    {
      id: 'views',
      eyebrow: 'Getting around',
      title: 'The views',
      node: 'views',
      paras: ['The sidebar switches between ways of seeing the same records.'],
    },
    {
      id: 'detail',
      eyebrow: 'The record itself',
      title: 'Opening a record',
      paras: [
        'Click any item to open it. Everything is edited in place — click the title to rename, click the description to write. No edit mode, no save button.',
      ],
      bullets: [
        '**Description** with `[[links]]` to other records.',
        '**Checklist** — sub-items to tick off; the count shows on the card.',
        '**Dependencies** — *Blocked by* and *Blocks* (the other side fills itself in). An open blocker flags the task everywhere.',
        '**Reminders** — offsets before it’s due, or a specific time.',
        '**Free slot** — for an open task, Weavo finds the next gap in your working hours and offers to put it on the calendar.',
      ],
    },
    {
      id: 'google',
      eyebrow: 'Connected',
      title: 'Google',
      paras: [
        'In [Settings → Integrations](/settings), paste your Google OAuth Client ID and connect. It runs client-side and asks for **read-only** access — Weavo never writes to your Google account. Full setup steps are in `INTEGRATIONS.md`.',
      ],
      bullets: [
        '**Calendar** — your primary calendar (−7 to +45 days) is mirrored in, refreshed every 5 minutes and on demand. Mirrored events are read-only here.',
        '**Gmail** — the Mail view lists messages matching your search (default `is:starred`); each becomes a task or note with a link back to the thread.',
      ],
    },
    {
      id: 'reminders',
      eyebrow: 'Being nudged',
      title: 'Reminders & notifications',
      paras: [
        'Add a reminder from any task or event. Weavo checks every 30 seconds; when one comes due it raises a **desktop notification** (click it to open the record) and an in-app toast, and the reminder jumps to the top of the Dashboard rail with **Snooze** and **Dismiss**.',
        'Turn notifications on in [Settings → Reminders](/settings). **They only fire while a Weavo tab is open** — push when the app is fully closed needs a server, which isn’t built yet.',
      ],
    },
    { id: 'keys', eyebrow: 'Faster', title: 'Keyboard', node: 'keys' },
    {
      id: 'data',
      eyebrow: 'Where it lives',
      title: 'Your data',
      paras: [
        'Everything is stored in this browser. It’s private and works offline, but it’s tied to this device — no cross-device sync yet. In [Settings → Your data](/settings) you can **Export** and **Import** a JSON file, **Load example** data, or **Clear all**.',
      ],
    },
    {
      id: 'day',
      eyebrow: 'Putting it together',
      title: 'A typical day',
      ol: [
        '**Through the day** — hit `C` and dump things in. Don’t stop to file them; leave them unsorted if you’re moving fast.',
        '**In the morning** — open [Home](/) and see what is on fire and what today holds.',
        '**While working** — live in the [To-do](/todo); switch between personal and [work](/todo/work) in the heading. Flag what is on fire.',
        '**In the evening** — write the day into [Reflection](/reflection) and move leftovers to tomorrow.',
      ],
    },
    {
      id: 'later',
      eyebrow: 'On the roadmap',
      title: 'Not yet',
      bullets: [
        '**Slack** — needs a small backend; next phase.',
        '**Push notifications** when no tab is open — also needs a backend.',
        '**Writing to Google Calendar** — currently read-only.',
        '**Cross-device sync** — use Export / Import for now.',
      ],
    },
  ],
}

const KIND_ICONS = [CalendarDays, ListChecks, FileText]
const KIND_TONES = ['sage', 'iris', 'ink'] as const
const VIEW_META: { key: 'home' | 'todo' | 'calendar' | 'projects' | 'reflection' | 'timeline' | 'notes' | 'unsorted'; icon: typeof LayoutGrid; to: string }[] = [
  { key: 'home', icon: LayoutGrid, to: '/' },
  { key: 'todo', icon: ListChecks, to: '/todo' },
  { key: 'calendar', icon: CalendarDays, to: '/calendar' },
  { key: 'projects', icon: Columns3, to: '/projects' },
  { key: 'reflection', icon: Sunrise, to: '/reflection' },
  { key: 'timeline', icon: GanttChartSquare, to: '/timeline' },
  { key: 'notes', icon: Network, to: '/notes' },
  { key: 'unsorted', icon: Inbox, to: '/triage' },
]

export function Guide() {
  const t = useT()
  const lang = useLang()
  const g = lang === 'cs' ? CS : EN
  const startTour = useStore((s) => s.startTour)
  const replaceAll = useStore((s) => s.replaceAll)
  const itemCount = useStore((s) => Object.keys(s.data.items).length)
  const toast = useStore((s) => s.toast)

  return (
    <Page
      title={t.nav.guide}
      width="narrow"
      actions={
        <a href="https://github.com/vorlis08/weavo" target="_blank" rel="noreferrer" className="text-sm text-ink-3 hover:text-ink-2">
          {t.common.source}
        </a>
      }
    >
          <section className="pb-4">
            <SectionLabel className="mb-2.5">{g.what}</SectionLabel>
            <h2 className="display text-2xl leading-tight text-balance">
              {g.headline}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-2">{g.intro}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent" onClick={startTour}>
                <Sparkles size={13} />
                {g.takeTour}
              </Button>
              {itemCount === 0 && (
                <Button
                  onClick={() => {
                    replaceAll(makeSampleData(new Date(), lang))
                    toast(g.exampleToast)
                  }}
                >
                  {g.loadExample}
                </Button>
              )}
            </div>
          </section>

          {g.sections.map((sec) => (
            <section key={sec.id} id={sec.id} className="border-t border-line py-9">
              <SectionLabel className="mb-2.5">{sec.eyebrow}</SectionLabel>
              <h2 className="display text-2xl text-balance">{sec.title}</h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-2">
                {sec.paras?.map((p, i) => (
                  <p key={i}>
                    <MD text={p} />
                  </p>
                ))}

                {sec.node === 'capture' && <CapturePlayground />}

                {sec.node === 'records' && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {g.recordKinds.map((r, i) => {
                      const Icon = KIND_ICONS[i]
                      const tone = KIND_TONES[i]
                      return (
                        <div key={r.name} className="rounded-md border border-line bg-surface p-4">
                          <span
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg',
                              tone === 'sage' && 'bg-sage/14 text-sage',
                              tone === 'iris' && 'bg-iris/14 text-iris-2',
                              tone === 'ink' && 'bg-surface-3 text-ink-2',
                            )}
                          >
                            <Icon size={16} strokeWidth={1.6} />
                          </span>
                          <div className="mt-2.5 text-base font-medium text-ink">{r.name}</div>
                          <p className="mt-1 text-sm leading-snug text-ink-2">{r.body}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {sec.node === 'views' && (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {VIEW_META.map((v) => (
                      <Link
                        key={v.key}
                        to={v.to}
                        className="group rounded-md border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
                      >
                        <div className="flex items-center gap-2 text-base font-medium text-ink">
                          <v.icon size={15} strokeWidth={1.6} className="text-ink-3 group-hover:text-ink" />
                          {t.nav[v.key]}
                        </div>
                        <p className="mt-1 text-sm leading-snug text-ink-2">{g.viewBlurbs[v.key]}</p>
                      </Link>
                    ))}
                    <div className="rounded-md border border-line bg-surface p-3.5">
                      <div className="flex items-center gap-2 text-base font-medium text-ink">
                        <Mail size={15} strokeWidth={1.6} className="text-ink-3" />
                        {t.nav.mail}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-ink-2">{g.mailBlurb}</p>
                    </div>
                  </div>
                )}

                {sec.node === 'keys' && (
                  <div className="overflow-hidden rounded-md border border-line">
                    {(
                      [
                        [<Kbd key="c">C</Kbd>, g.keyLabels[0]],
                        [<span key="k"><Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></span>, g.keyLabels[1]],
                        [<span key="g"><Kbd>G</Kbd> → <Kbd>D</Kbd>/<Kbd>C</Kbd>/<Kbd>B</Kbd>/<Kbd>T</Kbd>/<Kbd>N</Kbd></span>, g.keyLabels[2]],
                        [<Kbd key="q">?</Kbd>, g.keyLabels[3]],
                        [<Kbd key="e">Esc</Kbd>, g.keyLabels[4]],
                      ] as [ReactNode, string][]
                    ).map(([k, label], i) => (
                      <div
                        key={i}
                        className={cn('flex items-center gap-4 px-4 py-2.5 text-sm', i > 0 && 'border-t border-line')}
                      >
                        <span className="w-[190px] shrink-0">{k}</span>
                        <span className="text-ink-2">{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {sec.bullets && (
                  <ul className="ml-4 list-disc space-y-1.5 marker:text-ink-3">
                    {sec.bullets.map((b, i) => (
                      <li key={i}>
                        <MD text={b} />
                      </li>
                    ))}
                  </ul>
                )}

                {sec.ol && (
                  <ol className="ml-4 list-decimal space-y-2 marker:text-ink-3 marker:[font-family:var(--font-mono)]">
                    {sec.ol.map((b, i) => (
                      <li key={i}>
                        <MD text={b} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          ))}

          <div className="flex items-center gap-3 border-t border-line py-8 text-sm text-ink-3">
            <Command size={14} />
            {g.footer}
            <Button variant="ghost" className="ml-auto" onClick={startTour}>
              <Sparkles size={13} />
              {g.replay}
            </Button>
          </div>
    </Page>
  )
}
