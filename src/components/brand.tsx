import { SPACE_COLOR } from '@/lib/types'

/** the Weavo mark: two threads, personal and work, crossing */
export function WeavoMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
      <path d="M3 8.5c3.5 0 5.5 7 9 7s5.5-7 9-7" stroke={SPACE_COLOR.personal} />
      {/* the work thread passes over the personal one — a dark halo reads as a weave */}
      <path d="M3 15.5c3.5 0 5.5-7 9-7s5.5 7 9 7" stroke="var(--color-surface-2)" strokeWidth={5} />
      <path d="M3 15.5c3.5 0 5.5-7 9-7s5.5 7 9 7" stroke={SPACE_COLOR.work} />
    </svg>
  )
}

export function WeavoLogo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-line-2 bg-surface-2">
        <WeavoMark />
      </span>
      <span className="display text-[17px] tracking-[-0.02em]">Weavo</span>
    </span>
  )
}
