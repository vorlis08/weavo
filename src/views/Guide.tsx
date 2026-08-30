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
import { TopBar } from '@/components/TopBar'
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
  headline: 'Jedno místo pro události, úkoly a poznámky — a vazby mezi nimi.',
  intro:
    'Nejdřív zachyť, roztřídit můžeš pak — nebo nikdy. Všechno může ukazovat na všechno: úkol na projekt, úkol na ten, na který čeká, poznámka na jinou poznámku. Weavo běží celé v prohlížeči; žádný účet, žádný server, data neopustí toto zařízení.',
  takeTour: 'Spustit 40s průvodku',
  loadExample: 'Načíst ukázková data',
  exampleToast: 'Ukázková data načtena',
  recordKinds: [
    { name: 'Událost', body: 'Čas začátku a konce (nebo celý den). Je v kalendáři. Může nést účastníky.' },
    { name: 'Úkol', body: 'Stav (Udělat, Probíhá, Blokováno, Hotovo), termín, řešitel, kontrolní seznam a závislosti.' },
    { name: 'Poznámka', body: 'Volný text. Propoj ji s čímkoli přes [[název]] — druhá strana pak ukáže zpětný odkaz.' },
  ],
  viewBlurbs: {
    Dashboard:
      'Týden jako kalendář plus panel: dnes k termínu a po termínu, živé připomínky, schránka netříděných a odložené úkoly. Klik do prázdna přidá událost.',
    Calendar: 'Plnější kalendář s režimy Týden a Měsíc.',
    Board: 'Kanban: Netříděné → Udělat → Probíhá → Blokováno → Hotovo. Přetáhni kartu a změň stav.',
    Timeline: 'Jedna dráha na projekt na časové ose. Úkoly jako pruhy, události jako body.',
    Notes: 'Každá poznámka je uzel, každý [[odkaz]] hrana. Najetím zvýrazníš sousedy, kliknutím otevřeš.',
    Digest: 'Psaný souhrn: dnes v kalendáři, po termínu, dnes k termínu, tento týden, čeká, odloženo, hotovo.',
    Unsorted: 'Seznam k roztřídění — každé položce dej projekt, otevři, založ, nebo smaž.',
  },
  mailBlurb:
    'Objeví se po připojení Googlu — Gmail zprávy, ze kterých uděláš úkol nebo poznámku. Viz Google níže.',
  seeGoogle: 'Google',
  keyLabels: [
    'Rychlé zachycení',
    'Paleta příkazů — hledej vše, skoč kamkoli',
    'Přejít na Přehled / Kalendář / Nástěnku / Časovou osu / Mapu poznámek',
    'Zobrazit seznam zkratek',
    'Zavřít dialog nebo panel zachycení',
  ],
  footer: 'Kdykoli zmáčkni ? pro zkratky, nebo se sem vrať z postranního panelu.',
  replay: 'Spustit průvodku znovu',
  sections: [
    {
      id: 'capture',
      eyebrow: 'Nejrychlejší cesta dovnitř',
      title: 'Rychlé zachycení',
      node: 'capture',
      paras: [
        'Kdekoli zmáčkni `C`. Napiš jednu větu a Weavo si z ní vytáhne strukturu — datum, `#projekt`, `@osobu`. Uprav text níže a sleduj, jak to funguje:',
        'U **úkolu** se rozpoznaný čas stane termínem; u **události** začátkem. `Enter` zachytí, `Shift+Enter` odřádkuje. **Nechat netříděné** to hodí do schránky místo založení; **Přidat detaily** to vytvoří a otevře.',
      ],
    },
    {
      id: 'records',
      eyebrow: 'Stavební kameny',
      title: 'Tři typy záznamu',
      node: 'records',
      paras: [
        'Sdílejí stejná pole a kdykoli je přepneš přes menu `···` u záznamu. Položka označená jako **netříděná** je ta, kterou jsi ještě nezařadil — čeká ve schránce a v prvním sloupci nástěnky.',
      ],
    },
    {
      id: 'views',
      eyebrow: 'Orientace',
      title: 'Pohledy',
      node: 'views',
      paras: ['Postranní panel přepíná způsoby, jak se dívat na stejné záznamy.'],
    },
    {
      id: 'detail',
      eyebrow: 'Samotný záznam',
      title: 'Otevření záznamu',
      paras: [
        'Klikni na cokoli a otevře se to. Vše se edituje na místě — klikni na název pro přejmenování, na popis pro psaní. Žádný editační režim, žádné tlačítko uložit.',
      ],
      bullets: [
        '**Popis** s `[[odkazy]]` na jiné záznamy.',
        '**Kontrolní seznam** — dílčí body k odškrtnutí; počet se ukáže na kartě.',
        '**Závislosti** — *Blokováno* a *Blokuje* (druhá strana se doplní sama). Otevřený blokátor označí úkol všude.',
        '**Připomínky** — s předstihem před termínem, nebo v konkrétní čas.',
        '**Volný slot** — u otevřeného úkolu najde Weavo nejbližší mezeru v pracovních hodinách a nabídne dát ho do kalendáře.',
      ],
    },
    {
      id: 'google',
      eyebrow: 'Propojení',
      title: 'Google',
      paras: [
        'V [Nastavení → Integrace](/settings) vlož svůj Google OAuth Client ID a připoj. Běží v prohlížeči a žádá **jen pro čtení** — Weavo do tvého Google účtu nikdy nezapisuje. Celý návod je v `INTEGRATIONS.md`.',
      ],
      bullets: [
        '**Kalendář** — hlavní kalendář (−7 až +45 dní) se zrcadlí dovnitř, obnovuje se každých 5 minut i na vyžádání. Zrcadlené události jsou tu jen pro čtení.',
        '**Gmail** — pohled Pošta vypíše zprávy podle tvého dotazu (výchozí `is:starred`); z každé uděláš úkol nebo poznámku s odkazem zpět.',
      ],
    },
    {
      id: 'reminders',
      eyebrow: 'Připomenutí',
      title: 'Připomínky a notifikace',
      paras: [
        'Připomínku přidáš u libovolného úkolu nebo události. Weavo kontroluje každých 30 sekund; když nastane čas, vyskočí **desktopová notifikace** (kliknutím otevře záznam) a toast v appce, a připomínka vyskočí na začátek panelu na Přehledu s tlačítky **Odložit** a **Zavřít**.',
        'Notifikace zapneš v [Nastavení → Připomínky](/settings). **Fungují jen když je otevřená karta Weava** — push při úplně zavřené appce potřebuje server, ten zatím není.',
      ],
    },
    {
      id: 'keys',
      eyebrow: 'Rychleji',
      title: 'Klávesnice',
      node: 'keys',
    },
    {
      id: 'data',
      eyebrow: 'Kde to bydlí',
      title: 'Tvoje data',
      paras: [
        'Vše je uloženo v tomto prohlížeči. Je to soukromé a funguje offline, ale je to vázané na toto zařízení — sync mezi zařízeními zatím není. V [Nastavení → Tvoje data](/settings) můžeš **exportovat** a **importovat** JSON, **načíst ukázku** nebo **vymazat vše**.',
      ],
    },
    {
      id: 'day',
      eyebrow: 'Dohromady',
      title: 'Typický den',
      ol: [
        '**Přes den** — zmáčkni `C` a házej věci dovnitř. Nezastavuj se u třídění; nech je netříděné, když spěcháš.',
        '**Jednou denně** — otevři [Netříděné](/triage) (nebo si přečti [Souhrn](/digest)) a vyčisti schránku.',
        '**Při práci** — žij v [Přehledu](/) nebo na [Nástěnce](/board); přetahuj karty, jak se věci hýbou.',
        '**Jednou týdně** — projeď [Souhrn](/digest) — co je po termínu, co přijde a co ztichlo.',
      ],
    },
    {
      id: 'later',
      eyebrow: 'Na plánu',
      title: 'Co zatím není',
      bullets: [
        '**Slack** — potřebuje malý backend; další fáze.',
        '**Push notifikace** při zavřené kartě — taky potřebují backend.',
        '**Zápis do Google Kalendáře** — zatím jen čtení.',
        '**Sync mezi zařízeními** — zatím přes Export / Import.',
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
    Dashboard:
      'The week as a calendar plus a rail: due today and overdue, live reminders, your unsorted inbox, and stale tasks. Click an empty slot to add an event.',
    Calendar: 'A fuller calendar with Week and Month modes.',
    Board: 'Kanban: Unsorted → To do → In progress → Blocked → Done. Drag a card to change its status.',
    Timeline: 'One lane per project across a date axis. Tasks as bars, events as dots.',
    Notes: 'Every note a node, every [[link]] an edge. Hover to light up neighbours, click to open.',
    Digest: 'A written rollup: on the calendar today, overdue, due today, coming up, waiting, deferred, done.',
    Unsorted: 'The triage list — give each item a project, open it, file it, or delete it.',
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
        '**Once a day** — open [Unsorted](/triage) (or read the [Digest](/digest)) and clear the inbox.',
        '**While working** — live in the [Dashboard](/) or the [Board](/board); drag cards as things move.',
        '**Once a week** — scan the [Digest](/digest) for what’s overdue, coming, and gone quiet.',
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
const VIEW_META: { key: string; icon: typeof LayoutGrid; to: string }[] = [
  { key: 'Dashboard', icon: LayoutGrid, to: '/' },
  { key: 'Calendar', icon: CalendarDays, to: '/calendar' },
  { key: 'Board', icon: Columns3, to: '/board' },
  { key: 'Timeline', icon: GanttChartSquare, to: '/timeline' },
  { key: 'Notes', icon: Network, to: '/notes' },
  { key: 'Digest', icon: Sunrise, to: '/digest' },
  { key: 'Unsorted', icon: Inbox, to: '/triage' },
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
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.nav.guide}</h1>
        <a
          href="https://github.com/vorlis08/weavo"
          target="_blank"
          rel="noreferrer"
          className="mono ml-auto text-[11px] text-ink-3 hover:text-ink-2"
        >
          {t.common.source}
        </a>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[760px]">
          <section className="pb-4">
            <SectionLabel className="mb-2.5">{g.what}</SectionLabel>
            <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-balance">
              {g.headline}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{g.intro}</p>
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
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-balance">{sec.title}</h2>
              <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-2">
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
                        <div key={r.name} className="rounded-xl border border-line bg-surface p-4">
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
                          <div className="mt-2.5 text-[14px] font-medium text-ink">{r.name}</div>
                          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{r.body}</p>
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
                        className="group rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
                      >
                        <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                          <v.icon size={15} strokeWidth={1.6} className="text-ink-3 group-hover:text-iris-2" />
                          {v.key === 'Notes' ? t.nav.notes : v.key === 'Unsorted' ? t.nav.unsorted : v.key === 'Dashboard' ? t.nav.dashboard : v.key === 'Calendar' ? t.nav.calendar : v.key === 'Board' ? t.nav.board : v.key === 'Timeline' ? t.nav.timeline : t.nav.digest}
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-ink-2">{g.viewBlurbs[v.key]}</p>
                      </Link>
                    ))}
                    <div className="rounded-xl border border-line bg-surface p-3.5">
                      <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                        <Mail size={15} strokeWidth={1.6} className="text-ink-3" />
                        {t.nav.mail}
                      </div>
                      <p className="mt-1 text-[12px] leading-snug text-ink-2">{g.mailBlurb}</p>
                    </div>
                  </div>
                )}

                {sec.node === 'keys' && (
                  <div className="overflow-hidden rounded-xl border border-line">
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
                        className={cn('flex items-center gap-4 px-4 py-2.5 text-[13px]', i > 0 && 'border-t border-line')}
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

          <div className="flex items-center gap-3 border-t border-line py-8 text-[12px] text-ink-3">
            <Command size={14} />
            {g.footer}
            <Button variant="ghost" className="ml-auto" onClick={startTour}>
              <Sparkles size={13} />
              {g.replay}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
