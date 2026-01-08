import { useState, useCallback, useEffect, useRef } from 'react';

interface VideoPiPState {
  taskTitle: string;
  subtaskTitle: string;
  timeLeft: number;
  initialDuration: number;
  isRunning: boolean;
}

interface UseVideoPictureInPictureReturn {
  isSupported: boolean;
  isPiPOpen: boolean;
  openPiP: (state: VideoPiPState) => Promise<void>;
  updatePiP: (state: VideoPiPState) => void;
  closePiP: () => void;
}

/**
 * Video-based Picture-in-Picture hook
 * Uses Canvas + Video API for true always-on-top behavior
 * Works even over fullscreen apps on macOS
 */
export function useVideoPictureInPicture(): UseVideoPictureInPictureReturn {
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<VideoPiPState | null>(null);
  const flashPhaseRef = useRef<number>(0);

  // Check if Video PiP is supported
  const isSupported = typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    document.pictureInPictureEnabled;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Get color based on progress
  const getProgressColor = (percentage: number): { r: number; g: number; b: number } => {
    if (percentage > 66) {
      return { r: 96, g: 165, b: 250 }; // blue-400
    } else if (percentage > 33) {
      return { r: 192, g: 132, b: 252 }; // purple-400
    } else {
      return { r: 239, g: 68, b: 68 }; // red-500
    }
  };

  // Draw timer on canvas
  const drawCanvas = useCallback((ctx: CanvasRenderingContext2D, state: VideoPiPState) => {
    const { timeLeft, initialDuration, taskTitle, subtaskTitle, isRunning } = state;
    const width = 320;
    const height = 180;

    const progressPercentage = initialDuration > 0
      ? Math.max(0, Math.min(100, (timeLeft / initialDuration) * 100))
      : 0;

    const color = getProgressColor(progressPercentage);
    const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

    // Flash effect for low time (red state)
    const isLowTime = progressPercentage <= 33;
    flashPhaseRef.current += 0.15;
    const flashIntensity = isLowTime
      ? 0.5 + 0.5 * Math.sin(flashPhaseRef.current * 3) // Fast flash
      : 1;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a'); // slate-900
    gradient.addColorStop(0.5, '#581c87'); // purple-900
    gradient.addColorStop(1, '#0f172a'); // slate-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Background glow effect (pulsing when low time)
    const glowAlpha = isLowTime ? 0.2 + 0.3 * flashIntensity : 0.2;
    const glowGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha})`);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);

    // Timer text - clean white, no glow on text
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatTime(timeLeft), width / 2, 60);

    // Progress bar settings
    const barX = 20;
    const barY = 110;
    const barWidth = width - 40;
    const barHeight = 12; // Thicker bar
    const barRadius = 6;
    const progressWidth = (barWidth * progressPercentage) / 100;

    // Progress bar background
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Progress bar fill with glow effect
    if (progressWidth > 0) {
      // Multiple glow layers for intense effect
      const glowLayers = isLowTime ? 5 : 3;
      for (let i = glowLayers; i >= 1; i--) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(progressWidth, barRadius * 2), barHeight, barRadius);
        const layerAlpha = (0.3 / i) * flashIntensity;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${layerAlpha})`;
        ctx.shadowBlur = 12 * i * flashIntensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = colorStr;
        ctx.fill();
        ctx.restore();
      }

      // Main progress bar
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(progressWidth, barRadius * 2), barHeight, barRadius);

      // Gradient fill for progress bar
      const barGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      barGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 40)}, ${Math.min(255, color.g + 40)}, ${Math.min(255, color.b + 40)}, ${flashIntensity})`);
      barGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${flashIntensity})`);
      barGradient.addColorStop(1, `rgba(${Math.max(0, color.r - 30)}, ${Math.max(0, color.g - 30)}, ${Math.max(0, color.b - 30)}, ${flashIntensity})`);
      ctx.fillStyle = barGradient;
      ctx.fill();

      // Bright edge glow on progress end
      if (progressWidth > barRadius) {
        const edgeX = barX + progressWidth - 4;
        const edgeGradient = ctx.createRadialGradient(
          edgeX, barY + barHeight / 2, 0,
          edgeX, barY + barHeight / 2, 16
        );
        edgeGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * flashIntensity})`);
        edgeGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.6 * flashIntensity})`);
        edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = edgeGradient;
        ctx.beginPath();
        ctx.arc(edgeX, barY + barHeight / 2, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Task title
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const truncatedTask = taskTitle.length > 35 ? taskTitle.substring(0, 35) + '...' : taskTitle;
    ctx.fillText(truncatedTask, width / 2, 145);

    // Subtask title
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const truncatedSubtask = subtaskTitle.length > 40 ? subtaskTitle.substring(0, 40) + '...' : subtaskTitle;
    ctx.fillText(truncatedSubtask, width / 2, 163);

    // Pause indicator
    if (!isRunning) {
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('PAUSED', width / 2, 88);
    }

    // Flash border effect when low time
    if (isLowTime) {
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.3 * flashIntensity})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);
    }
  }, []);

  // Animation loop
  const startRenderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (stateRef.current) {
        drawCanvas(ctx, stateRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, [drawCanvas]);

  // Stop animation loop
  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Open Video PiP
  const openPiP = useCallback(async (state: VideoPiPState) => {
    if (!isSupported) {
      console.warn('Video Picture-in-Picture is not supported');
      return;
    }

    try {
      // Create canvas if not exists
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      // Create video if not exists
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.style.display = 'none';
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        videoRef.current = video;
      }

      stateRef.current = state;
      flashPhaseRef.current = 0;

      // Start rendering to canvas
      startRenderLoop();

      // Capture canvas as video stream
      const stream = canvasRef.current.captureStream(30); // 30 FPS
      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      // Request PiP
      await videoRef.current.requestPictureInPicture();
      setIsPiPOpen(true);

      // Handle PiP close
      videoRef.current.addEventListener('leavepictureinpicture', () => {
        setIsPiPOpen(false);
        stopRenderLoop();
      }, { once: true });

    } catch (error) {
      console.error('Failed to open Video PiP:', error);
      stopRenderLoop();
    }
  }, [isSupported, startRenderLoop, stopRenderLoop]);

  // Update PiP state
  const updatePiP = useCallback((state: VideoPiPState) => {
    stateRef.current = state;
  }, []);

  // Close PiP
  const closePiP = useCallback(() => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(console.error);
    }
    stopRenderLoop();
    setIsPiPOpen(false);
  }, [stopRenderLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRenderLoop();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, [stopRenderLoop]);

  return {
    isSupported,
    isPiPOpen,
    openPiP,
    updatePiP,
    closePiP,
  };
}
