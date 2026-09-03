import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookOpen, Download, Sparkles, Trash2, Upload } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, SectionLabel, Select } from '@/components/ui'
import { ConfirmDialog } from '@/components/overlays'
import { GoogleConnect } from '@/components/GoogleConnect'
import { useStore } from '@/lib/store'
import { LANGS, useT } from '@/lib/i18n'
import type { Lang, WeavoData } from '@/lib/types'
import { makeSampleData } from '@/lib/sampleData'
import { ensureNotificationPermission } from '@/lib/notify'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <SectionLabel className="mb-3">{title}</SectionLabel>
      <div className="rounded-xl border border-line bg-surface p-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-line py-3 first:border-0 first:pt-0 last:pb-0">
      <div className="flex-1">
        <div className="text-[13px]">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
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
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.settings.title}</h1>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-[600px]">
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

          <p className="pb-4 text-center text-[11px] text-ink-3">
            Weavo · <a href="https://github.com/vorlis08/weavo" target="_blank" rel="noreferrer">{t.settings.sourceLink}</a>
          </p>
        </div>
      </div>

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
    </>
  )
}
