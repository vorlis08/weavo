import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, LogOut, RefreshCw } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import {
  connectGoogle,
  currentScopes,
  fetchProfile,
  forgetToken,
  initGoogle,
} from '@/lib/google'
import { listCalendarEvents } from '@/lib/gcal'
import { addDays, fmtAgo, startOfDay } from '@/lib/date'
import { Avatar, Button, Checkbox, TextField, cn } from './ui'

const SETUP_URL =
  'https://console.cloud.google.com/apis/credentials/oauthclient'

export function GoogleConnect() {
  const t = useT()
  const google = useStore((s) => s.data.google)
  const updateGoogle = useStore((s) => s.updateGoogle)
  const upsertExternalEvents = useStore((s) => s.upsertExternalEvents)
  const toast = useStore((s) => s.toast)

  const [clientId, setClientId] = useState(google.clientId)
  const [busy, setBusy] = useState<null | 'connect' | 'sync'>(null)

  async function connect() {
    const id = clientId.trim()
    if (!id) return
    setBusy('connect')
    try {
      updateGoogle({ clientId: id })
      await initGoogle(id)
      await connectGoogle()
      const profile = await fetchProfile()
      updateGoogle({
        connected: true,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        scopes: currentScopes(),
        lastError: undefined,
      })
      toast(t.google.connectedAs(profile.email))
    } catch (e) {
      updateGoogle({ lastError: e instanceof Error ? e.message : String(e) })
      toast(t.google.couldNotConnect)
    } finally {
      setBusy(null)
    }
  }

  async function syncNow() {
    setBusy('sync')
    try {
      await initGoogle(google.clientId)
      const start = startOfDay(addDays(new Date(), -7))
      const end = addDays(new Date(), 45)
      const events = await listCalendarEvents(start, end)
      upsertExternalEvents(events, { start: start.toISOString(), end: end.toISOString() })
      toast(t.google.syncedEvents(events.length))
    } catch (e) {
      updateGoogle({ lastError: e instanceof Error ? e.message : String(e) })
      toast(t.google.syncFailed)
    } finally {
      setBusy(null)
    }
  }

  function disconnect() {
    forgetToken()
    updateGoogle({
      connected: false,
      email: undefined,
      name: undefined,
      picture: undefined,
      scopes: [],
      lastError: undefined,
    })
    toast(t.google.disconnected)
  }

  if (!google.connected) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] leading-relaxed text-ink-2">{t.google.intro}</p>
        <TextField
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          spellCheck={false}
        />
        <div className="flex items-center gap-2">
          <Button variant="accent" onClick={connect} disabled={!clientId.trim() || busy === 'connect'}>
            {busy === 'connect' ? t.google.connecting : t.google.connect}
          </Button>
          <a
            href={SETUP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11.5px] text-iris hover:text-iris-2"
          >
            {t.google.getClientId} <ExternalLink size={11} />
          </a>
        </div>
        {google.lastError && (
          <p className="rounded-lg bg-rose/10 px-3 py-2 text-[11.5px] text-rose">{google.lastError}</p>
        )}
        <p className="text-[11px] leading-relaxed text-ink-3">{t.google.originHint(location.origin)}</p>
      </div>
    )
  }

  const scopeOk = (s: string) => google.scopes.some((x) => x.includes(s))

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        {google.picture ? (
          <img src={google.picture} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <Avatar name={google.name ?? google.email ?? 'G'} size={36} />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px]">{google.name ?? google.email}</div>
          <div className="truncate text-[11px] text-ink-3">{google.email}</div>
        </div>
        <Button variant="ghost" onClick={disconnect}>
          <LogOut size={13} />
          {t.google.disconnect}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          ['calendar', t.nav.calendar],
          ['gmail', 'Gmail'],
        ].map(([scope, label]) => (
          <span
            key={scope}
            className={cn(
              'inline-flex h-[22px] items-center gap-1 rounded-md px-2 text-[11px]',
              scopeOk(scope) ? 'bg-sage/12 text-sage' : 'bg-surface-3 text-ink-3',
            )}
          >
            {scopeOk(scope) && <Check size={11} />}
            {label}
          </span>
        ))}
      </div>

      <label className="flex items-center gap-2.5 text-[12.5px] text-ink-2">
        <Checkbox
          checked={google.calendarSyncEnabled}
          onChange={() => updateGoogle({ calendarSyncEnabled: !google.calendarSyncEnabled })}
        />
        {t.google.mirrorLabel}
      </label>

      <div className="flex items-center gap-2">
        <Button onClick={syncNow} disabled={busy === 'sync'}>
          <RefreshCw size={13} className={busy === 'sync' ? 'animate-spin' : ''} />
          {t.google.syncNow}
        </Button>
        {google.lastCalendarSync && (
          <span className="text-[11px] text-ink-3">{t.google.syncedAgo(fmtAgo(google.lastCalendarSync))}</span>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <div className="mb-1.5 text-[12px]">{t.google.gmailQueryLabel}</div>
        <TextField
          defaultValue={google.gmailQuery}
          onBlur={(e) => updateGoogle({ gmailQuery: e.target.value.trim() || 'is:starred' })}
          placeholder="is:starred"
          spellCheck={false}
        />
        <Link to="/mail" className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-iris hover:text-iris-2">
          {t.google.openMail}
        </Link>
      </div>

      {google.lastError && (
        <p className="rounded-lg bg-rose/10 px-3 py-2 text-[11.5px] text-rose">{google.lastError}</p>
      )}
    </div>
  )
}
