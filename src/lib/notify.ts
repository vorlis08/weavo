export function canNotify() {
  return typeof Notification !== 'undefined'
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!canNotify()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function showNotification(title: string, body?: string) {
  if (!canNotify() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: 'weavo' })
  } catch {
    /* some browsers require a ServiceWorker for Notification ctor — ignore */
  }
}
