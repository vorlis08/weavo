import { useMemo } from 'react'
import { ArrowRight, Check, Inbox, Trash2 } from 'lucide-react'
import { Page } from '@/components/Page'
import { Button, EmptyState, Select } from '@/components/ui'
import { KindIcon } from '@/components/items'
import { useConfirmDelete } from '@/components/useConfirmDelete'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { SPACES } from '@/lib/types'

/** the inbox: give each captured thing a project and file it, open it, or delete it */
export function Triage() {
  const t = useT()
  const itemsRec = useStore((s) => s.data.items)
  const projectsRec = useStore((s) => s.data.projects)
  const unsorted = useMemo(
    () =>
      Object.values(itemsRec)
        .filter((it) => it.unsorted)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [itemsRec],
  )
  const projects = useMemo(() => Object.values(projectsRec).filter((p) => p.status !== 'done'), [projectsRec])
  const updateItem = useStore((s) => s.updateItem)
  const openPeek = useStore((s) => s.openPeek)
  const toast = useStore((s) => s.toast)
  const { askDelete, dialog } = useConfirmDelete()

  function file(id: string) {
    updateItem(id, { unsorted: undefined })
    toast(t.triage.filed)
  }

  return (
    <Page
      title={t.triage.title}
      eyebrow={unsorted.length > 0 ? t.triage.toProcess(unsorted.length) : undefined}
      width="narrow"
    >
      {unsorted.length === 0 ? (
        <EmptyState icon={<Inbox size={22} strokeWidth={1.5} />} title={t.triage.emptyTitle} hint={t.triage.emptyHint} />
      ) : (
        <div className="border-t border-line">
          {unsorted.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-2 py-3">
              <span className="text-ink-3">
                <KindIcon kind={it.kind} size={17} />
              </span>
              <button
                onClick={() => openPeek(it.id)}
                className="min-w-0 flex-1 truncate text-left text-base hover:text-ink"
              >
                {it.title}
              </button>
              <div className="flex items-center gap-1.5 max-sm:w-full">
                <Select
                  value={it.projectId ?? ''}
                  onChange={(e) => updateItem(it.id, { projectId: e.target.value || undefined })}
                  className="h-8 w-[190px] max-sm:flex-1"
                  aria-label={t.detail.propProject}
                >
                  <option value="">{t.common.noProject}</option>
                  {SPACES.map((sp) => (
                    <optgroup key={sp} label={t.spaces[sp]}>
                      {projects
                        .filter((p) => p.space === sp)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
                <Button variant="ghost" size="sm" square onClick={() => openPeek(it.id)} title={t.triage.openDetails}>
                  <ArrowRight size={15} />
                </Button>
                <Button size="sm" square onClick={() => file(it.id)} title={t.triage.file} className="hover:border-sage/40 hover:text-sage">
                  <Check size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  square
                  onClick={() => askDelete(it.id, it.title)}
                  title={t.triage.deleteTip}
                  className="hover:text-rose"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </Page>
  )
}
