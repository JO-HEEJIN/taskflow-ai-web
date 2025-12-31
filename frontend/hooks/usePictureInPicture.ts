import { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';

interface PiPWindowOptions {
  width?: number;
  height?: number;
}

interface UsePictureInPictureReturn {
  isSupported: boolean;
  isPiPOpen: boolean;
  openPiP: (content: React.ReactNode, options?: PiPWindowOptions) => Promise<void>;
  closePiP: () => void;
}

/**
 * Hook to use the Document Picture-in-Picture API
 * Allows rendering React components in an always-on-top floating window
 *
 * Browser Support:
 * - Chrome/Edge 116+: Full support
 * - Firefox/Safari: Not supported (fallback to FloatingTimerWidget)
 */
export function usePictureInPicture(): UsePictureInPictureReturn {
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  // Check if Document Picture-in-Picture API is supported
  const isSupported = typeof window !== 'undefined' &&
    // @ts-ignore - Document Picture-in-Picture API
    'documentPictureInPicture' in window;

  /**
   * Copy all stylesheets from main document to PiP window
   * This ensures the PiP window has the same styles (Tailwind, etc.)
   */
  const copyStyles = useCallback((pipWindow: Window) => {
    // Copy all stylesheets
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((styleSheet) => {
      try {
        if (styleSheet.href) {
          // External stylesheet - create link element
          const link = pipWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        } else if (styleSheet.cssRules) {
          // Inline stylesheet - copy rules
          const style = pipWindow.document.createElement('style');
          Array.from(styleSheet.cssRules).forEach((rule) => {
            style.appendChild(pipWindow.document.createTextNode(rule.cssText));
          });
          pipWindow.document.head.appendChild(style);
        }
      } catch (error) {
        console.warn('Failed to copy stylesheet:', error);
      }
    });

    // Add base styles for PiP window
    const baseStyle = pipWindow.document.createElement('style');
    baseStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: transparent;
      }
      #pip-root {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
    pipWindow.document.head.appendChild(baseStyle);
  }, []);

  /**
   * Open a Picture-in-Picture window with React content
   */
  const openPiP = useCallback(async (
    content: React.ReactNode,
    options: PiPWindowOptions = {}
  ) => {
    if (!isSupported) {
      console.warn('Document Picture-in-Picture API is not supported in this browser');
      return;
    }

    try {
      // @ts-ignore - Document Picture-in-Picture API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: options.width || 320,
        height: options.height || 180,
      });

      pipWindowRef.current = pipWindow;
      setIsPiPOpen(true);

      // Copy styles from main document
      copyStyles(pipWindow);

      // Create root container for React
      const rootContainer = pipWindow.document.createElement('div');
      rootContainer.id = 'pip-root';
      pipWindow.document.body.appendChild(rootContainer);

      // Render React content
      const root = createRoot(rootContainer);
      reactRootRef.current = root;
      root.render(content);

      // Handle PiP window close
      pipWindow.addEventListener('pagehide', () => {
        setIsPiPOpen(false);
        pipWindowRef.current = null;
        reactRootRef.current = null;
      });

    } catch (error) {
      console.error('Failed to open Picture-in-Picture window:', error);
      setIsPiPOpen(false);
    }
  }, [isSupported, copyStyles]);

  /**
   * Update the content of an already-open PiP window
   */
  const updatePiP = useCallback((content: React.ReactNode) => {
    if (reactRootRef.current && isPiPOpen) {
      reactRootRef.current.render(content);
    }
  }, [isPiPOpen]);

  /**
   * Close the Picture-in-Picture window
   */
  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      reactRootRef.current = null;
      setIsPiPOpen(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  return {
    isSupported,
    isPiPOpen,
    openPiP,
    updatePiP,
    closePiP,
  };
}
