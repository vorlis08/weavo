/** what the Electron shell (desktop/preload.cjs) exposes to the page, when Weavo runs as the desktop app */
export interface SnoozeChoice {
  label: string
  minutes?: number
  /** until 9:00 tomorrow, worked out when the button is pressed */
  tomorrow?: boolean
}

export interface ReminderAlert {
  reminderId: string
  itemId: string
  title: string
  body: string
  /** strings for the native alert window, which has no access to the i18n dictionary */
  labels: { heading: string; done: string; open: string; snooze: string; showDone: boolean }
  snoozes: SnoozeChoice[]
}

export interface AlertAction {
  reminderId: string
  itemId: string
  action: 'done' | 'snooze' | 'open'
  minutes?: number
  tomorrow?: boolean
}

export interface WeavoDesktop {
  isDesktop: true
  showAlert: (a: ReminderAlert) => void
  /** closes an alert window (the same reminder was handled elsewhere) */
  closeAlert: (reminderId: string) => void
  onAlertAction: (cb: (a: AlertAction) => void) => () => void
  focusApp: () => void
  getAutostart: () => Promise<boolean>
  setAutostart: (on: boolean) => Promise<boolean>
}

declare global {
  interface Window {
    weavoDesktop?: WeavoDesktop
  }
}

export const desktop = () => (typeof window === 'undefined' ? undefined : window.weavoDesktop)

/** minutes from now until 9:00 tomorrow */
export function minutesUntilTomorrowMorning(now = new Date()) {
  const t = new Date(now)
  t.setDate(t.getDate() + 1)
  t.setHours(9, 0, 0, 0)
  return Math.max(1, Math.round((t.getTime() - now.getTime()) / 60_000))
}
