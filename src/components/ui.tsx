import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Check } from 'lucide-react'
import { initials, tintFor } from '@/lib/util'

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3', className)}>
      {children}
    </div>
  )
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block h-[7px] w-[7px] shrink-0 rounded-full', className)}
      style={{ background: color }}
    />
  )
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
    accent: 'bg-iris text-[#0b0c0e]',
    rose: 'bg-rose/15 text-rose',
    amber: 'bg-amber/15 text-amber',
  }
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10.5px] font-semibold',
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
        'inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface-2 px-[9px] text-[11.5px] text-ink-2',
        onClick && 'transition-colors hover:border-line-2 hover:text-ink',
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
  square?: boolean
}
export function Button({ variant = 'default', square, className, children, ...rest }: BtnProps) {
  const variants = {
    default: 'border-line-2 bg-surface-2 text-ink hover:bg-surface-3',
    accent: 'border-transparent bg-iris text-[#0b0c0e] font-semibold hover:bg-iris-2',
    ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'border-transparent bg-rose/15 text-rose hover:bg-rose/25',
  }
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center justify-center gap-[7px] rounded-lg border px-[13px] text-[12.5px] font-medium transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-40',
        square && 'w-8 px-0',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Checkbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange?: () => void
  className?: string
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
        'flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
        checked ? 'border-iris bg-iris text-[#0b0c0e]' : 'border-line-2 hover:border-iris',
        className,
      )}
    >
      {checked && <Check size={11} strokeWidth={3} />}
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
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-[11px] font-medium transition-colors',
            size === 'sm' ? 'h-6 text-[11.5px]' : 'h-7 text-[12px]',
            value === o.value ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink',
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
    <span className="mono rounded border border-line px-1.5 py-px text-[10px] text-ink-3">
      {children}
    </span>
  )
}

const fieldCls =
  'h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-iris/50'

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        fieldCls,
        'h-auto min-h-[72px] resize-y py-2 leading-relaxed',
        props.className,
      )}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        fieldCls,
        'cursor-pointer appearance-none bg-[length:12px] bg-[right_8px_center] bg-no-repeat pr-7',
        props.className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2361656e' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
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
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-3">
          {icon}
        </div>
      )}
      <h2 className="text-[15px]">{title}</h2>
      {hint && <p className="mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed text-ink-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
