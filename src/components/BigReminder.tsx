import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BellRing, Check, ExternalLink } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { startAlarm } from '@/lib/alarm'
import { handleAlertAction } from '@/lib/alerts'
import { Button } from './ui'

/**
 * The in-app big reminder, for the browser version: a large card in the middle
 * of the screen with a chime, until Done / Snooze / Open. (The desktop app
 * opens a native always-on-top window instead — see desktop/.)
 */
export function BigReminder() {
  const t = useT()
  const alerts = useStore((s) => s.alerts)
  const a = alerts[0]
  const open = !!a

  useEffect(() => (open ? startAlarm() : undefined), [open])

  if (!a) return null
  const act = (action: 'done' | 'snooze' | 'open', extra?: { minutes?: number; tomorrow?: boolean }) =>
    handleAlertAction({ reminderId: a.reminderId, itemId: a.itemId, action, ...extra })

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#060609]/75 p-4 backdrop-blur-sm [animation:fade-in_.2s]">
      <div
        role="alertdialog"
        aria-label={a.title}
        className="w-full max-w-[640px] rounded-xl border border-flame/50 bg-surface p-8 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] [animation:sheet-up_.3s_var(--ease-out-soft)]"
      >
        <div className="mb-5 flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-flame">
          <BellRing size={18} className="animate-pulse" />
          {a.labels.heading}
          {alerts.length > 1 && (
            <span className="ml-auto text-xs font-medium normal-case tracking-normal text-ink-3">
              {t.bigReminder.more(alerts.length - 1)}
            </span>
          )}
        </div>
        <h2 className="display text-4xl font-semibold leading-tight">{a.title}</h2>
        {a.body && <p className="mt-3 text-lg text-ink-2">{a.body}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          {a.labels.showDone && (
            <Button variant="accent" className="!h-11 !px-5 !text-base" onClick={() => act('done')}>
              <Check size={18} />
              {a.labels.done}
            </Button>
          )}
          <Button className="!h-11 !px-5 !text-base" onClick={() => act('open')}>
            <ExternalLink size={16} />
            {a.labels.open}
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-1 text-sm text-ink-3">{a.labels.snooze}</span>
          {a.snoozes.map((s) => (
            <Button key={s.label} size="sm" onClick={() => act('snooze', { minutes: s.minutes, tomorrow: s.tomorrow })}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
