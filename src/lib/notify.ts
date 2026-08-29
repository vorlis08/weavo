export function canNotify() {
  return typeof Notification !== 'undefined'
}

export function notificationState(): NotificationPermission | 'unsupported' {
  return canNotify() ? Notification.permission : 'unsupported'
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!canNotify()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

/**
 * Weavo's reminders only fire while a tab is open, so a plain Notification with
 * an onclick handler is the right tool. reg.showNotification is the fallback for
 * browsers (mostly Android Chrome) where the Notification constructor throws.
 */
export async function showNotification(title: string, body?: string, onClick?: () => void) {
  if (!canNotify() || Notification.permission !== 'granted') return
  const icon = `${import.meta.env.BASE_URL}favicon.svg`
  try {
    const n = new Notification(title, { body, icon, tag: 'weavo' })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
    return
  } catch {
    /* constructor unavailable — fall through */
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    await reg?.showNotification(title, { body, icon, tag: 'weavo' })
  } catch {
    /* give up quietly */
  }
}
