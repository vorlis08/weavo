import { Calendar, FileText, HardDrive, Hash, Mail } from 'lucide-react'
import type { SourceKind } from '@/lib/types'
import { cn } from './ui'

const config: Record<
  SourceKind,
  { Icon: typeof Mail; fg: string; bg: string; label: string }
> = {
  gmail: { Icon: Mail, fg: 'text-rose', bg: 'bg-rose/12', label: 'Gmail' },
  slack: { Icon: Hash, fg: 'text-ink-2', bg: 'bg-white/[0.06]', label: 'Slack' },
  notion: { Icon: FileText, fg: 'text-ink-2', bg: 'bg-white/[0.06]', label: 'Notion' },
  drive: { Icon: HardDrive, fg: 'text-sage', bg: 'bg-sage/12', label: 'Google Drive' },
  gcal: { Icon: Calendar, fg: 'text-iris-2', bg: 'bg-iris/12', label: 'Google Calendar' },
}

export function SourceIcon({
  source,
  size = 19,
}: {
  source: SourceKind
  size?: number
}) {
  const { Icon, fg, bg, label } = config[source]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md',
        bg,
        fg,
      )}
      style={{ width: size, height: size }}
      title={`From ${label}`}
    >
      <Icon size={Math.round(size * 0.62)} strokeWidth={1.7} />
    </span>
  )
}
