import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Check } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { initials, tintFor } from '@/lib/util'

/** join class names; later classes win over conflicting earlier ones */
export function cn(...parts: (string | false | null | undefined)[]) {
  return twMerge(parts.filter(Boolean).join(' '))
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-xs font-medium text-ink-3', className)}>
      {children}
    </div>
  )
}

/** round dot — used for tags and plain color markers */
export function Dot({ color, className, title }: { color: string; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-block h-[7px] w-[7px] shrink-0 rounded-full', className)}
      style={{ background: color }}
    />
  )
}

/** small round dot — a project's identity mark */
export function ProjectGlyph({ color, className, title }: { color: string; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-block h-[7px] w-[7px] shrink-0 rounded-full', className)}
      style={{ background: color }}
    />
  )
}

/** short horizontal thread — marks personal vs work */
export function SpaceThread({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-[2px] w-3 shrink-0 rounded-full', className)} style={{ background: color }} />
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'rose' | 'amber'
}) {
  const tones = {
    default: 'bg-surface-3 text-ink-2',
    accent: 'bg-iris text-iris-ink',
    rose: 'bg-rose/15 text-rose',
    amber: 'bg-amber/15 text-amber',
  }
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Chip({
  children,
  className,
  style,
  onClick,
  title,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  title?: string
}) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-2 text-sm text-ink-2',
        onClick && 'transition-colors hover:border-line-3 hover:text-ink',
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'accent' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  square?: boolean
}
export function Button({ variant = 'default', size = 'md', square, className, children, ...rest }: BtnProps) {
  const variants = {
    default: 'border-line-2 bg-surface text-ink hover:border-line-3 hover:bg-surface-2',
    accent: 'border-transparent bg-iris text-iris-ink font-semibold hover:bg-iris-2',
    ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'border-transparent bg-rose/15 text-rose hover:bg-rose/25',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
        size === 'md' ? 'h-8 px-3 text-sm' : 'h-7 px-2.5 text-sm',
        square && (size === 'md' ? 'w-8 px-0' : 'w-7 px-0'),
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** square checkbox; done reads as a grey fill, not a color */
export function Checkbox({
  checked,
  onChange,
  className,
  size = 'md',
}: {
  checked: boolean
  onChange?: () => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onChange?.()
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          onChange?.()
        }
      }}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] transition-[background-color,border-color] duration-150',
        size === 'md' ? 'h-[14px] w-[14px]' : 'h-[13px] w-[13px]',
        checked ? 'border-ink-3 bg-ink-3 text-bg' : 'border-ink-4 hover:border-ink-2',
        className,
      )}
    >
      {checked && <Check size={10} strokeWidth={3.4} />}
    </span>
  )
}

export function Avatar({
  name,
  size = 22,
  title,
}: {
  name: string
  size?: number
  title?: string
}) {
  const tint = tintFor(name || '?')
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: tint.bg,
        color: tint.fg,
        fontSize: Math.round(size * 0.4),
      }}
      title={title ?? name}
    >
      {initials(name || '?')}
    </span>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cn('inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-sm font-medium transition-colors',
            size === 'sm' ? 'h-6' : 'h-7',
            value === o.value ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[4px] border border-line-2 px-1.5 py-px text-[10.5px] leading-[1.4] text-ink-3">
      {children}
    </span>
  )
}

const fieldCls =
  'h-8 w-full rounded-md border border-line-2 bg-surface px-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-iris/60'

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(fieldCls, 'h-auto min-h-[72px] resize-y py-2 leading-relaxed', props.className)}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        fieldCls,
        'cursor-pointer appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8',
        props.className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a889e' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        ...props.style,
      }}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </label>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-3">
          {icon}
        </div>
      )}
      <h2 className="display text-xl">{title}</h2>
      {hint && <p className="mt-2 max-w-[360px] text-sm leading-relaxed text-ink-2">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
