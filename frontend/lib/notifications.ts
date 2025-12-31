// Web Push Notifications Utility

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// VAPID public key - needs to be generated on backend
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn('Service Worker registration failed');
      return false;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const vapidResponse = await fetch(`${API_BASE_URL}/api/notifications/vapid-public-key`);
    if (!vapidResponse.ok) {
      console.error('Failed to get VAPID public key from backend');
      return false;
    }

    const { publicKey } = await vapidResponse.json();
    console.log('VAPID public key received from backend');

    // Subscribe to push using browser's PushManager
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('Creating new push subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log('New push subscription created');
    } else {
      console.log('Using existing push subscription');
    }

    // Generate unique device ID for this browser/device
    let deviceId = localStorage.getItem('deviceNotificationId');
    if (!deviceId) {
      deviceId = `browser-${crypto.randomUUID()}`;
      localStorage.setItem('deviceNotificationId', deviceId);
    }

    // Send subscription to backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          deviceId,
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push subscription with backend');
      }

      console.log('✅ Push subscription registered for device:', deviceId);
      console.log('👤 User ID:', userId);

      // Store the user ID for the service worker
      localStorage.setItem('notificationUserId', userId);

      return true;
    } catch (error) {
      console.error('Failed to register subscription with backend:', error);
      return false;
    }
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

async function sendSubscriptionToBackend(userId: string, subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }

    console.log('Subscription sent to backend');
  } catch (error) {
    console.error('Failed to send subscription to backend:', error);
  }
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }

    localStorage.removeItem('notificationUserId');
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
  }
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// ========================================
// Timer Notifications (Phase 4)
// ========================================

let timerNotificationInterval: NodeJS.Timeout | null = null;
let timerEndTime: number | null = null;

/**
 * Format time as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Update app badge with minutes remaining
 */
export async function updateAppBadge(minutesRemaining: number): Promise<void> {
  if (typeof window === 'undefined') return;

  // @ts-ignore - Badge API may not be in TypeScript types yet
  if ('setAppBadge' in navigator) {
    try {
      // @ts-ignore
      await navigator.setAppBadge(minutesRemaining);
    } catch (error) {
      console.error('Failed to update app badge:', error);
    }
  }
}

/**
 * Clear app badge
 */
export async function clearAppBadge(): Promise<void> {
  if (typeof window === 'undefined') return;

  // @ts-ignore - Badge API may not be in TypeScript types yet
  if ('clearAppBadge' in navigator) {
    try {
      // @ts-ignore
      await navigator.clearAppBadge();
    } catch (error) {
      console.error('Failed to clear app badge:', error);
    }
  }
}

/**
 * Show a notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    await requestNotificationPermission();
  }

  if (Notification.permission === 'granted') {
    // Use service worker notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          ...options,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        ...options,
        icon: '/icons/icon-192.png',
      });
    }
  }
}

/**
 * Update timer notification with current time remaining
 */
async function updateTimerNotification(): Promise<void> {
  if (!timerEndTime) return;

  const now = Date.now();
  const remaining = Math.max(0, timerEndTime - now);
  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.ceil(seconds / 60);

  if (remaining <= 0) {
    await stopTimerNotification();
    await showTimerCompletedNotification();
    return;
  }

  // Update notification every 10 seconds
  await showNotification('Focus Timer Active', {
    body: `Time remaining: ${formatTime(seconds)}`,
    tag: 'focus-timer',
    silent: true,
    requireInteraction: false,
    data: {
      type: 'timer-update',
      endTime: timerEndTime,
      remaining: seconds,
    },
  });

  // Update app badge
  await updateAppBadge(minutes);
}

/**
 * Start timer notification (updates every 10 seconds)
 */
export async function startTimerNotification(
  endTime: number,
  taskTitle?: string
): Promise<void> {
  // Stop any existing timer notification
  await stopTimerNotification();

  timerEndTime = endTime;

  // Request permission if needed
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  // Show initial notification
  const remaining = Math.max(0, endTime - Date.now());
  const seconds = Math.floor(remaining / 1000);

  await showNotification('Focus Timer Started', {
    body: taskTitle
      ? `Working on: ${taskTitle}\nTime: ${formatTime(seconds)}`
      : `Time: ${formatTime(seconds)}`,
    tag: 'focus-timer',
    requireInteraction: false,
    data: {
      type: 'timer-start',
      endTime,
      taskTitle,
    },
  });

  // Update badge
  await updateAppBadge(Math.ceil(seconds / 60));

  // Update notification every 10 seconds
  timerNotificationInterval = setInterval(updateTimerNotification, 10000);
}

/**
 * Stop timer notification and clear badge
 */
export async function stopTimerNotification(): Promise<void> {
  // Clear interval
  if (timerNotificationInterval) {
    clearInterval(timerNotificationInterval);
    timerNotificationInterval = null;
  }

  timerEndTime = null;

  // Clear badge
  await clearAppBadge();

  // Close notification if using service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.getNotifications({ tag: 'focus-timer' }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      });
    });
  }
}

/**
 * Show timer completed notification
 */
export async function showTimerCompletedNotification(): Promise<void> {
  await showNotification('Focus Timer Completed! 🎉', {
    body: 'Great work! Time for a break.',
    tag: 'focus-timer-complete',
    requireInteraction: true,
    data: {
      type: 'timer-complete',
    },
  });

  // Vibrate on mobile (handled separately, not part of NotificationOptions)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }

  // Clear badge
  await clearAppBadge();
}

/**
 * Pause timer notification (stop updates but don't clear)
 */
export async function pauseTimerNotification(): Promise<void> {
  // Clear interval but keep notification visible
  if (timerNotificationInterval) {
    clearInterval(timerNotificationInterval);
    timerNotificationInterval = null;
  }

  await showNotification('Focus Timer Paused ⏸️', {
    body: 'Timer is paused. Resume when ready.',
    tag: 'focus-timer',
    silent: true,
    requireInteraction: false,
  });
}

/**
 * Resume timer notification
 */
export async function resumeTimerNotification(endTime: number): Promise<void> {
  timerEndTime = endTime;

  await showNotification('Focus Timer Resumed ▶️', {
    body: 'Timer is running again!',
    tag: 'focus-timer',
    silent: true,
    requireInteraction: false,
  });

  // Restart update interval
  timerNotificationInterval = setInterval(updateTimerNotification, 10000);
}
