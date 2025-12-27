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
