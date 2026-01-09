import { useCallback, useState, useEffect } from 'react';

interface ElectronTimerState {
  taskTitle: string;
  subtaskTitle: string;
  duration: number; // in seconds
  autostart?: boolean;
}

interface UseElectronTimerReturn {
  isElectronAvailable: boolean;
  isAppInstalled: boolean | null;
  launchElectronTimer: (state: ElectronTimerState) => void;
  downloadApp: () => void;
  getDownloadUrl: () => string | null;
  detectedOS: 'mac' | 'windows' | 'other';
}

// GitHub Release URLs
const GITHUB_RELEASE_BASE = 'https://github.com/JO-HEEJIN/taskflow-ai-web/releases/download/v1.0.0-timer';
const DOWNLOAD_URLS = {
  mac: `${GITHUB_RELEASE_BASE}/TaskFlow.Timer-1.0.0-arm64.dmg`,
  windows: `${GITHUB_RELEASE_BASE}/TaskFlow.Timer.Setup.1.0.0.exe`,
};

/**
 * Hook for launching the TaskFlow Electron Timer app
 * - Tries deep link first (if app installed)
 * - Falls back to download page if not installed
 */
export function useElectronTimer(): UseElectronTimerReturn {
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean | null>(null);
  const [detectedOS, setDetectedOS] = useState<'mac' | 'windows' | 'other'>('other');

  // Detect OS and availability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect OS
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('mac') || userAgent.includes('mac')) {
      setDetectedOS('mac');
      setIsElectronAvailable(true);
    } else if (platform.includes('win') || userAgent.includes('win')) {
      setDetectedOS('windows');
      setIsElectronAvailable(true);
    } else {
      setDetectedOS('other');
      setIsElectronAvailable(false);
    }
  }, []);

  /**
   * Get download URL based on detected OS
   */
  const getDownloadUrl = useCallback((): string | null => {
    if (detectedOS === 'mac') return DOWNLOAD_URLS.mac;
    if (detectedOS === 'windows') return DOWNLOAD_URLS.windows;
    return null;
  }, [detectedOS]);

  /**
   * Download the app for the current OS
   */
  const downloadApp = useCallback(() => {
    const url = getDownloadUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }, [getDownloadUrl]);

  /**
   * Launch the Electron timer via deep link
   * If app not installed, prompts for download
   */
  const launchElectronTimer = useCallback((state: ElectronTimerState) => {
    const { taskTitle, subtaskTitle, duration, autostart = true } = state;

    // Construct deep link URL
    const params = new URLSearchParams({
      task: taskTitle,
      subtask: subtaskTitle,
      duration: String(duration),
      autostart: String(autostart),
    });

    const deepLink = `taskflow-timer://start?${params.toString()}`;
    console.log('🚀 Attempting to launch Electron timer:', deepLink);

    // Try to detect if app is installed by attempting deep link
    // Use a hidden iframe to avoid navigating away
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Set a timeout - if the app opens, the page will blur
    // If not, we'll show download prompt
    let appOpened = false;

    const handleBlur = () => {
      appOpened = true;
      setIsAppInstalled(true);
    };

    window.addEventListener('blur', handleBlur);

    // Try to open the deep link
    try {
      iframe.contentWindow?.location.replace(deepLink);
    } catch (e) {
      // Some browsers block this, try direct location
      window.location.href = deepLink;
    }

    // After a short delay, check if app opened
    setTimeout(() => {
      window.removeEventListener('blur', handleBlur);
      iframe.remove();

      if (!appOpened) {
        // App likely not installed, prompt for download
        setIsAppInstalled(false);

        const osName = detectedOS === 'mac' ? 'Mac' : 'Windows';
        const downloadUrl = getDownloadUrl();

        if (downloadUrl && confirm(
          `TaskFlow Timer is not installed.\n\n` +
          `Download the ${osName} app to get an always-on-top timer that works over fullscreen apps!\n\n` +
          `Click OK to download.`
        )) {
          window.open(downloadUrl, '_blank');
        }
      }
    }, 1500);

  }, [detectedOS, getDownloadUrl]);

  return {
    isElectronAvailable,
    isAppInstalled,
    launchElectronTimer,
    downloadApp,
    getDownloadUrl,
    detectedOS,
  };
}
