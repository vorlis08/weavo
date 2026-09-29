import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookOpen, Download, Sparkles, Trash2, Upload } from 'lucide-react'
import { Page } from '@/components/Page'
import { Button, Select } from '@/components/ui'
import { ConfirmDialog } from '@/components/overlays'
import { GoogleConnect } from '@/components/GoogleConnect'
import { GoogleSpaceSetting, TagSettings } from '@/components/TagSettings'
import { useStore } from '@/lib/store'
import { LANGS, useT } from '@/lib/i18n'
import type { Lang, WeavoData } from '@/lib/types'
import { makeSampleData } from '@/lib/sampleData'
import { ensureNotificationPermission } from '@/lib/notify'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 px-1 text-sm font-semibold text-ink-2">{title}</h2>
      <div className="rounded-lg border border-line bg-surface px-5 py-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line py-3.5 first:border-0 first:pt-0 last:pb-0">
      <div className="min-w-[200px] flex-1">
        <div className="text-base">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const EVENT_LEADS = [0, 5, 10, 15, 30, 60, 1440]
const TASK_LEADS = [0, 5, 10, 15, 30, 60, 120]
const DAY_TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '18:00']

function ReminderDefaultsRows() {
  const t = useT()
  const d = useStore((s) => s.data.settings.reminderDefaults)
  const updateSettings = useStore((s) => s.updateSettings)
  const set = (patch: Partial<typeof d>) => updateSettings({ reminderDefaults: { ...d, ...patch } })
  const lead = (m: number) =>
    m === 0
      ? t.remind.atTime
      : t.remind.before(m >= 1440 ? t.remind.days(m / 1440) : m >= 60 ? t.remind.hours(m / 60) : t.remind.minutes(m))
  const num = (v: string) => (v === 'off' ? null : Number(v))
  return (
    <>
      <Row label={t.remind.defEvent} hint={t.remind.defaultsHint}>
        <Select value={d.event ?? 'off'} onChange={(e) => set({ event: num(e.target.value) })} className="w-[190px]">
          <option value="off">{t.remind.off}</option>
          {EVENT_LEADS.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? t.remind.atStart : lead(m)}
            </option>
          ))}
        </Select>
      </Row>
      <Row label={t.remind.defTimed}>
        <Select
          value={d.taskTimed ?? 'off'}
          onChange={(e) => set({ taskTimed: num(e.target.value) })}
          className="w-[190px]"
        >
          <option value="off">{t.remind.off}</option>
          {TASK_LEADS.map((m) => (
            <option key={m} value={m}>
              {lead(m)}
            </option>
          ))}
        </Select>
      </Row>
      <Row label={t.remind.defDay}>
        <Select
          value={d.taskDay ?? 'off'}
          onChange={(e) => set({ taskDay: e.target.value === 'off' ? null : e.target.value })}
          className="w-[190px]"
        >
          <option value="off">{t.remind.off}</option>
          {DAY_TIMES.map((time) => (
            <option key={time} value={time}>
              {t.remind.defDayAt(time)}
            </option>
          ))}
        </Select>
      </Row>
    </>
  )
}

export function SettingsView() {
  const t = useT()
  const data = useStore((s) => s.data)
  const { updateSettings, startTour, replaceAll, clearAll, toast } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weavo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WeavoData
        if (!parsed.items || !parsed.settings) throw new Error('bad shape')
        replaceAll(parsed)
        toast(t.settings.dataImported)
      } catch {
        toast(t.settings.importFailed)
      }
    }
    reader.readAsText(file)
  }

  return (
    <Page title={t.settings.title} width="narrow">
      <Group title={t.settings.gLang}>
        <Row label={t.settings.langRow} hint={t.settings.langHint}>
          <Select
            value={data.settings.lang}
            onChange={(e) => updateSettings({ lang: e.target.value as Lang })}
            className="w-[130px]"
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Row>
      </Group>

      <Group title={t.settings.gStart}>
        <Row label={t.settings.tourRow} hint={t.settings.tourRowHint}>
          <Button onClick={startTour}>
            <Sparkles size={13} />
            {t.settings.startTour}
          </Button>
        </Row>
        <Row label={t.settings.fullGuideRow} hint={t.settings.fullGuideHint}>
          <Link to="/guide">
            <Button>
              <BookOpen size={13} />
              {t.settings.openGuide}
            </Button>
          </Link>
        </Row>
      </Group>

      <Group title={t.tagSettings.title}>
        <TagSettings />
      </Group>

      <Group title={t.settings.gCalendar}>
        <Row label={t.settings.weekStarts}>
          <Select
            value={data.settings.weekStartsMonday ? 'mon' : 'sun'}
            onChange={(e) => updateSettings({ weekStartsMonday: e.target.value === 'mon' })}
            className="w-[130px]"
          >
            <option value="mon">{t.settings.monday}</option>
            <option value="sun">{t.settings.sunday}</option>
          </Select>
        </Row>
        <Row label={t.settings.dayStarts}>
          <Select
            value={data.settings.dayStartHour}
            onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
            className="w-[90px]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 4).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </Row>
        <Row label={t.settings.dayEnds}>
          <Select
            value={data.settings.dayEndHour}
            onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}
            className="w-[90px]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 13).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </Row>
      </Group>

      <Group title={t.settings.gReminders}>
        <ReminderDefaultsRows />
        <Row
          label={t.settings.desktopNotifs}
          hint={
            notifPerm === 'granted'
              ? t.settings.notifsOn
              : notifPerm === 'denied'
                ? t.settings.notifsBlocked
                : t.settings.notifsOff
          }
        >
          <Button
            disabled={notifPerm === 'granted' || notifPerm === 'denied' || notifPerm === 'unsupported'}
            onClick={async () => {
              const ok = await ensureNotificationPermission()
              updateSettings({ notificationsAsked: true })
              toast(ok ? t.settings.notifsEnabledToast : t.settings.notifsDeniedToast)
            }}
          >
            <Bell size={13} />
            {notifPerm === 'granted' ? t.settings.enabled : t.settings.enable}
          </Button>
        </Row>
      </Group>

      <Group title={t.settings.gIntegrations}>
        <GoogleConnect />
        <GoogleSpaceSetting />
      </Group>

      <Group title={t.settings.gData}>
        <Row label={t.settings.dataRow} hint={t.settings.dataHint}>
          <div className="flex gap-2">
            <Button onClick={exportData}>
              <Download size={13} />
              {t.settings.export}
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload size={13} />
              {t.settings.import}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
            />
          </div>
        </Row>
        <Row label={t.settings.exampleRow} hint={t.settings.exampleHint}>
          <Button onClick={() => replaceAll(makeSampleData(new Date(), data.settings.lang))}>
            {t.settings.loadExample}
          </Button>
        </Row>
        <Row label={t.settings.startOverRow} hint={t.settings.startOverHint}>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            <Trash2 size={13} />
            {t.settings.clearAll}
          </Button>
        </Row>
      </Group>

      <p className="pb-4 text-center text-xs text-ink-3">
        Weavo ·{' '}
        <a href="https://github.com/vorlis08/weavo" target="_blank" rel="noreferrer">
          {t.settings.sourceLink}
        </a>
      </p>

      <ConfirmDialog
        open={confirmClear}
        title={t.settings.clearConfirmTitle}
        body={t.settings.clearConfirmBody}
        confirmLabel={t.settings.clearAll}
        onConfirm={() => {
          clearAll()
          setConfirmClear(false)
          toast(t.settings.cleared)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Page>
  )
}
