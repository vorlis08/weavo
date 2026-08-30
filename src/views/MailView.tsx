import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, FileText, ListChecks, Mail, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, EmptyState } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { initGoogle } from '@/lib/google'
import { listMail, type MailSummary } from '@/lib/gmail'
import { fmtAgo } from '@/lib/date'

export function MailView() {
  const t = useT()
  const navigate = useNavigate()
  const google = useStore((s) => s.data.google)
  const createItem = useStore((s) => s.createItem)
  const updateGoogle = useStore((s) => s.updateGoogle)
  const toast = useStore((s) => s.toast)

  const [mail, setMail] = useState<MailSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!google.connected || !google.clientId) return
    setLoading(true)
    setError(null)
    try {
      await initGoogle(google.clientId)
      setMail(await listMail(google.gmailQuery, 30))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      if (/auth|token|consent|401/i.test(msg)) {
        updateGoogle({ connected: false, lastError: t.google.sessionExpired })
      }
    } finally {
      setLoading(false)
    }
  }, [google.connected, google.clientId, google.gmailQuery, updateGoogle, t])

  useEffect(() => {
    load()
  }, [load])

  function convert(m: MailSummary, kind: 'task' | 'note') {
    const it = createItem({
      kind,
      title: m.subject,
      body: `${t.mail.fromLine(m.fromName, m.from)}\n\n${m.snippet}\n\n${m.url}`,
      source: 'gmail',
      externalId: m.id,
      externalUrl: m.url,
      unsorted: true,
      status: kind === 'task' ? 'todo' : undefined,
    })
    toast(t.mail.added(kind === 'task' ? t.kind.taskLower : t.kind.noteLower), {
      label: t.common.open,
      run: () => navigate(`/item/${it.id}`),
    })
  }

  if (!google.connected) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">{t.mail.title}</h1>
        </TopBar>
        <EmptyState
          icon={<Mail size={22} strokeWidth={1.5} />}
          title={t.mail.notConnectedTitle}
          hint={t.mail.notConnectedHint}
          action={
            <Link to="/settings">
              <Button variant="accent">{t.mail.openSettings}</Button>
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.mail.title}</h1>
        <span className="mono text-ink-3">{google.gmailQuery}</span>
        <Button variant="ghost" className="ml-auto text-[12px]" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t.mail.refresh}
        </Button>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[760px]">
          {error && (
            <p className="mb-4 rounded-lg bg-rose/10 px-3 py-2 text-[12px] text-rose">{error}</p>
          )}
          {!loading && mail.length === 0 && !error && (
            <EmptyState
              icon={<Mail size={22} strokeWidth={1.5} />}
              title={t.mail.noMailTitle}
              hint={t.mail.noMailHint(google.gmailQuery)}
            />
          )}
          <div className="flex flex-col gap-2">
            {mail.map((m) => (
              <div
                key={m.id}
                className="group flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] font-medium">{m.subject}</span>
                    <span className="mono shrink-0 text-[10px] text-ink-3">{fmtAgo(m.date)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11.5px] text-ink-3">{m.fromName}</div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">{m.snippet}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => convert(m, 'task')}
                    className="flex items-center gap-1.5 rounded-lg border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:text-ink"
                  >
                    <ListChecks size={12} />
                    {t.mail.toTask}
                  </button>
                  <button
                    onClick={() => convert(m, 'note')}
                    className="flex items-center gap-1.5 rounded-lg border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:text-ink"
                  >
                    <FileText size={12} />
                    {t.mail.toNote}
                  </button>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-ink-3 hover:text-ink-2"
                  >
                    <ExternalLink size={12} />
                    Gmail
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
