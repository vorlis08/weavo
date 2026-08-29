import { useRef, useState } from 'react'
import { Bell, Download, Plus, Trash2, Upload } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, SectionLabel, Select, TextField, cn } from '@/components/ui'
import { ConfirmDialog } from '@/components/overlays'
import { useStore } from '@/lib/store'
import { PROJECT_COLORS } from '@/lib/types'
import type { WeavoData } from '@/lib/types'
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
  const data = useStore((s) => s.data)
  const {
    updateSettings,
    addProject,
    updateProject,
    deleteProject,
    addContact,
    updateContact,
    deleteContact,
    replaceAll,
    clearAll,
    toast,
  } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [newProject, setNewProject] = useState('')
  const [newContact, setNewContact] = useState('')

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
        toast('Data imported')
      } catch {
        toast('Could not read that file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">Settings</h1>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-[600px]">
          <Group title="You">
            <Row label="Display name" hint="Used for the “Mine” board filter and as the default assignee.">
              <TextField
                defaultValue={data.settings.displayName}
                placeholder="Your name"
                onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
                className="w-[180px]"
              />
            </Row>
          </Group>

          <Group title="Calendar">
            <Row label="Week starts on">
              <Select
                value={data.settings.weekStartsMonday ? 'mon' : 'sun'}
                onChange={(e) => updateSettings({ weekStartsMonday: e.target.value === 'mon' })}
                className="w-[130px]"
              >
                <option value="mon">Monday</option>
                <option value="sun">Sunday</option>
              </Select>
            </Row>
            <Row label="Day starts at">
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
            <Row label="Day ends at">
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

          <Group title="Reminders">
            <Row
              label="Desktop notifications"
              hint={
                notifPerm === 'granted'
                  ? 'On — reminders pop up while Weavo is open.'
                  : notifPerm === 'denied'
                    ? 'Blocked in your browser settings.'
                    : 'Get a notification when a reminder comes due.'
              }
            >
              <Button
                disabled={notifPerm === 'granted' || notifPerm === 'denied' || notifPerm === 'unsupported'}
                onClick={async () => {
                  const ok = await ensureNotificationPermission()
                  updateSettings({ notificationsAsked: true })
                  toast(ok ? 'Notifications enabled' : 'Permission not granted')
                }}
              >
                <Bell size={13} />
                {notifPerm === 'granted' ? 'Enabled' : 'Enable'}
              </Button>
            </Row>
          </Group>

          <Group title="Projects">
            {Object.values(data.projects).map((p) => (
              <Row key={p.id} label={p.name}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => updateProject(p.id, { color: c.value })}
                        className={cn(
                          'h-4 w-4 rounded-full ring-offset-2 ring-offset-surface',
                          p.color === c.value && 'ring-2 ring-white/40',
                        )}
                        style={{ background: c.value }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="text-ink-3 hover:text-rose"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Row>
            ))}
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <TextField
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProject.trim()) {
                    addProject(
                      newProject,
                      PROJECT_COLORS[Object.keys(data.projects).length % PROJECT_COLORS.length].value,
                    )
                    setNewProject('')
                  }
                }}
                placeholder="New project name"
              />
              <Button
                onClick={() => {
                  if (newProject.trim()) {
                    addProject(
                      newProject,
                      PROJECT_COLORS[Object.keys(data.projects).length % PROJECT_COLORS.length].value,
                    )
                    setNewProject('')
                  }
                }}
              >
                <Plus size={13} />
                Add
              </Button>
            </div>
          </Group>

          <Group title="People">
            {Object.values(data.contacts).map((c) => (
              <Row key={c.id} label={c.name} hint={c.email}>
                <div className="flex items-center gap-2">
                  <TextField
                    defaultValue={c.role ?? ''}
                    placeholder="Role"
                    onBlur={(e) => updateContact(c.id, { role: e.target.value.trim() || undefined })}
                    className="w-[130px]"
                  />
                  <button onClick={() => deleteContact(c.id)} className="text-ink-3 hover:text-rose">
                    <Trash2 size={13} />
                  </button>
                </div>
              </Row>
            ))}
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <TextField
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newContact.trim()) {
                    addContact({ name: newContact.trim() })
                    setNewContact('')
                  }
                }}
                placeholder="New person's name"
              />
              <Button
                onClick={() => {
                  if (newContact.trim()) {
                    addContact({ name: newContact.trim() })
                    setNewContact('')
                  }
                }}
              >
                <Plus size={13} />
                Add
              </Button>
            </div>
          </Group>

          <Group title="Your data">
            <Row label="Everything is stored in this browser" hint="No account, no server. Export to move it or back it up.">
              <div className="flex gap-2">
                <Button onClick={exportData}>
                  <Download size={13} />
                  Export
                </Button>
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload size={13} />
                  Import
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
            <Row label="Example data" hint="Replace everything with a demo dataset anchored to this week.">
              <Button onClick={() => replaceAll(makeSampleData())}>Load example</Button>
            </Row>
            <Row label="Start over" hint="Delete all items, projects, and people.">
              <Button variant="danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={13} />
                Clear all
              </Button>
            </Row>
          </Group>

          <p className="pb-4 text-center text-[11px] text-ink-3">
            Weavo · <a href="https://github.com/vorlis08/weavo" target="_blank" rel="noreferrer">source on GitHub</a>
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear everything?"
        body="This removes all your items, projects, and people from this browser. Export first if you want a copy."
        confirmLabel="Clear all"
        onConfirm={() => {
          clearAll()
          setConfirmClear(false)
          toast('Cleared')
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}
