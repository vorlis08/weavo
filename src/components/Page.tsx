import type { ReactNode } from 'react'
import { cn } from './ui'

/**
 * A page: big display title with an optional eyebrow, lede and actions,
 * then the content. `fill` gives full-height views (calendar, board) the rest
 * of the viewport instead of a scrolling column.
 */
export function Page({
  eyebrow,
  title,
  lede,
  actions,
  before,
  children,
  width = 'default',
  fill,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  /** breadcrumb or anything above the title */
  before?: ReactNode
  children: ReactNode
  width?: 'default' | 'narrow' | 'wide'
  fill?: boolean
  className?: string
}) {
  const max = width === 'narrow' ? 'max-w-[760px]' : width === 'wide' ? 'max-w-[1400px]' : 'max-w-[1140px]'
  const header = (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1">
        {before}
        {eyebrow && <div className="mb-1.5 text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="display text-3xl lg:text-[34px] lg:leading-[1.08]">{title}</h1>
        {lede && <div className="mt-2.5 max-w-[64ch] text-base text-ink-2">{lede}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
  if (fill)
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col px-4 pb-24 pt-6 md:px-10 md:pb-6 md:pt-9', className)}>
        {header}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    )
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={cn('mx-auto w-full px-4 pb-28 pt-6 md:px-10 md:pb-24 md:pt-9', max, className)}>
        {header}
        {children}
      </div>
    </div>
  )
}

/** a titled group of content inside a page */
export function Section({
  title,
  count,
  icon,
  hint,
  tone,
  action,
  children,
  className,
}: {
  title: ReactNode
  count?: number
  icon?: ReactNode
  hint?: ReactNode
  tone?: 'hot'
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-8', className)}>
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 pb-2 text-sm font-semibold',
          tone === 'hot' ? 'text-flame' : 'text-ink-2',
        )}
      >
        {icon}
        {title}
        {count != null && <span className="font-medium text-ink-3">{count}</span>}
        {hint && <span className="ml-auto text-sm font-normal text-ink-3">{hint}</span>}
        {action && <span className={cn(!hint && 'ml-auto')}>{action}</span>}
      </div>
      {children}
    </section>
  )
}

/** a raised panel — for summaries and side rails, not for lists */
export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-[18px]', className)}>
      {(title || action) && (
        <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold text-ink-2">
          {title}
          {action && <span className="ml-auto text-sm font-medium">{action}</span>}
        </h3>
      )}
      {children}
    </section>
  )
}
