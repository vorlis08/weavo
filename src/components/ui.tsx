import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { AccentName, Contact } from '@/lib/types'

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export const accentText: Record<AccentName, string> = {
  iris: 'text-iris-2',
  amber: 'text-amber',
  rose: 'text-rose',
  sage: 'text-sage',
  ink: 'text-ink-2',
}
export const accentBar: Record<AccentName, string> = {
  iris: 'border-l-iris bg-iris/12',
  amber: 'border-l-amber bg-amber/12',
  rose: 'border-l-rose bg-rose/12',
  sage: 'border-l-sage bg-sage/12',
  ink: 'border-l-ink-3 bg-white/5',
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
  tone?: 'default' | 'accent' | 'rose'
}) {
  const tones = {
    default: 'bg-surface-3 text-ink-2',
    accent: 'bg-iris text-[#0b0c0e]',
    rose: 'bg-rose/12 text-rose',
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
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface-2 px-[9px] text-[11.5px] text-ink-2',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'accent' | 'ghost'
  square?: boolean
}
export function Button({ variant = 'default', square, className, children, ...rest }: BtnProps) {
  const variants = {
    default: 'border-line-2 bg-surface-2 text-ink hover:bg-surface-3',
    accent: 'border-transparent bg-iris text-[#0b0c0e] font-semibold hover:bg-iris-2',
    ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
  }
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center justify-center gap-[7px] rounded-lg border px-[13px] text-[12.5px] font-medium transition-colors active:translate-y-px',
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

export function Avatar({ contact, size = 22 }: { contact: Contact; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: contact.tintBg,
        color: contact.tintFg,
        fontSize: Math.round(size * 0.4),
      }}
      title={contact.name}
    >
      {contact.initials}
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
            value === o.value
              ? 'bg-surface-3 text-ink'
              : 'text-ink-2 hover:text-ink',
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
