/**
 * Notification helpers. Tries to use the registered Service Worker so reminders
 * fire even if the tab is closed (in installed PWA). Falls back to in-page
 * Notification or a toast if permission is denied or SW is unavailable.
 */

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export async function showNotification(title: string, body: string, tag?: string) {
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return false;

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
        });
        return true;
      }
    } catch {
      /* fall through */
    }
  }
  try {
    new Notification(title, { body, icon: "/icon-192.png", tag });
    return true;
  } catch {
    return false;
  }
}

/** Schedule a notification with a setTimeout. Returns the timeout id so you can cancel. */
export function scheduleNotification(
  delayMs: number,
  title: string,
  body: string,
  tag?: string,
): number {
  return window.setTimeout(() => {
    void showNotification(title, body, tag);
  }, delayMs);
}
