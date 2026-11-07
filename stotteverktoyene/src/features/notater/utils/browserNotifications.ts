/** Tynn innpakning rundt Notification-API-et (Chrome-varsler), trygg å kalle i alle miljøer. */

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Spør om tillatelse hvis den ikke er gitt/avslått ennå. Må kalles fra en brukerhandling. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Viser et systemvarsel. Returnerer varselet, eller null hvis det ikke er tillatt. */
export function showBrowserNotification(
  title: string,
  options: NotificationOptions & { onClick?: () => void },
): Notification | null {
  if (getNotificationPermission() !== "granted") return null;
  try {
    const { onClick, ...rest } = options;
    const notification = new Notification(title, rest);
    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
    return notification;
  } catch {
    return null;
  }
}
