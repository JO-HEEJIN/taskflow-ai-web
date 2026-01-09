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

// Star data for twinkling background
interface Star {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  brightness: number;
}

/**
 * Video-based Picture-in-Picture hook with silent audio track
 * Uses Canvas + Video API + AudioContext for true always-on-top behavior
 * Works even over fullscreen apps on macOS by tricking OS with audio track
 */
export function useVideoPictureInPicture(): UseVideoPictureInPictureReturn {
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<VideoPiPState | null>(null);
  const flashPhaseRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const frameCountRef = useRef<number>(0);

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
      return { r: 167, g: 139, b: 250 }; // purple-400
    } else {
      return { r: 251, g: 113, b: 133 }; // rose-400
    }
  };

  // Generate stars for background
  const generateStars = useCallback((width: number, height: number): Star[] => {
    const stars: Star[] = [];
    const numStars = 30; // Sparse stars for small canvas

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.2 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.5 + 0.3,
      });
    }
    return stars;
  }, []);

  // Draw timer on canvas - Night sky with bloom effects
  const drawCanvas = useCallback((ctx: CanvasRenderingContext2D, state: VideoPiPState) => {
    const { timeLeft, initialDuration, subtaskTitle, isRunning } = state;
    // Reduced size (1/3 of original 320x180)
    const width = 160;
    const height = 90;

    const progressPercentage = initialDuration > 0
      ? Math.max(0, Math.min(100, (timeLeft / initialDuration) * 100))
      : 0;

    const color = getProgressColor(progressPercentage);
    frameCountRef.current += 1;

    // Flash effect ONLY in last 10 seconds
    const isLast10Seconds = timeLeft <= 10;
    flashPhaseRef.current += 0.15;
    const flashIntensity = isLast10Seconds
      ? 0.5 + 0.5 * Math.sin(flashPhaseRef.current * 5)
      : 1;

    // === NIGHT SKY GRADIENT BACKGROUND ===
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0118');    // Deep black-purple
    gradient.addColorStop(0.4, '#12082a');  // Dark purple
    gradient.addColorStop(0.7, '#0d1a2d');  // Dark blue
    gradient.addColorStop(1, '#0a0118');    // Back to black-purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // === TWINKLING STARS ===
    if (starsRef.current.length === 0) {
      starsRef.current = generateStars(width, height);
    }

    starsRef.current.forEach(star => {
      const twinkle = Math.sin(frameCountRef.current * star.twinkleSpeed + star.twinkleOffset);
      const currentBrightness = star.brightness * (0.5 + 0.5 * twinkle);

      // Star glow
      const glowGradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, star.size * 3
      );
      glowGradient.addColorStop(0, `rgba(200, 200, 255, ${currentBrightness})`);
      glowGradient.addColorStop(0.5, `rgba(150, 150, 220, ${currentBrightness * 0.3})`);
      glowGradient.addColorStop(1, 'rgba(100, 100, 180, 0)');

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Star core
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${currentBrightness})`;
      ctx.fill();
    });

    // === TIMER TEXT (smaller, synced color) ===
    const textColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

    ctx.font = 'bold 28px SF Pro Display, -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text glow (subtle)
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = isLast10Seconds
      ? `rgba(${color.r}, ${color.g}, ${color.b}, ${flashIntensity})`
      : textColor;
    ctx.fillText(formatTime(timeLeft), width / 2, 30);
    ctx.shadowBlur = 0;

    // === PROGRESS BAR - Thick with beautiful bloom ===
    const barX = 12;
    const barY = 58;
    const barWidth = width - 24;
    const barHeight = 10;
    const barRadius = 5;
    const progressWidth = Math.max((barWidth * progressPercentage) / 100, barRadius * 2);

    // Bar background (subtle)
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Progress bar with BLOOM effect
    if (progressPercentage > 0) {
      // Outer glow (bloom)
      const bloomIntensity = 0.6 + 0.4 * Math.sin(frameCountRef.current * 0.05);

      // Large outer bloom
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      ctx.shadowBlur = 15 * bloomIntensity;
      ctx.beginPath();
      ctx.roundRect(barX, barY, progressWidth, barHeight, barRadius);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      ctx.fill();

      // Medium bloom layer
      ctx.shadowBlur = 8 * bloomIntensity;
      ctx.beginPath();
      ctx.roundRect(barX, barY, progressWidth, barHeight, barRadius);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
      ctx.fill();

      // Core fill (bright)
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(barX + 1, barY + 1, progressWidth - 2, barHeight - 2, barRadius - 1);
      const coreGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 0.4)`);
      coreGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
      coreGradient.addColorStop(1, `rgba(${color.r * 0.7}, ${color.g * 0.7}, ${color.b * 0.7}, 1)`);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    }

    // === SUBTASK TITLE ===
    ctx.font = '500 9px SF Pro Text, -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const truncatedSubtask = subtaskTitle.length > 25 ? subtaskTitle.substring(0, 25) + '...' : subtaskTitle;
    ctx.fillText(truncatedSubtask, width / 2, 80);

    // Pause indicator
    if (!isRunning) {
      ctx.font = '600 8px SF Pro Text, -apple-system, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('PAUSED', width / 2, 48);
    }

    // Flash border ONLY in last 10 seconds
    if (isLast10Seconds && flashIntensity > 0.7) {
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${flashIntensity * 0.6})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);
    }
  }, [generateStars]);

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

  /**
   * Create nearly-inaudible audio track to trick macOS into treating PiP as important media
   * This makes PiP follow across Spaces and stay on top of fullscreen apps
   *
   * Key insight: gain = 0 might be optimized away by browser/OS.
   * Using 0.0001 is completely inaudible but registers as active audio.
   */
  const createAudioTrack = useCallback(() => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('🔊 PiP: AudioContext not supported');
      return null;
    }

    try {
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Create inaudible oscillator
      // Using very low frequency (1Hz) + near-zero gain = completely inaudible
      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = 1; // 1Hz is below human hearing range

      const gainNode = ctx.createGain();
      // 0.0001 is -80dB, completely inaudible but registers as active audio
      gainNode.gain.value = 0.0001;

      const destination = ctx.createMediaStreamDestination();

      oscillator.connect(gainNode);
      gainNode.connect(destination);
      oscillator.start();

      const audioTrack = destination.stream.getAudioTracks()[0];
      console.log('🔊 PiP: Audio track created successfully', {
        state: ctx.state,
        trackEnabled: audioTrack?.enabled,
        trackReadyState: audioTrack?.readyState
      });

      return audioTrack;
    } catch (error) {
      console.error('🔊 PiP: Failed to create audio track:', error);
      return null;
    }
  }, []);

  // Open Video PiP with silent audio track
  const openPiP = useCallback(async (state: VideoPiPState) => {
    if (!isSupported) {
      console.warn('Video Picture-in-Picture is not supported');
      return;
    }

    try {
      // Create canvas if not exists (1/3 size: 160x90)
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      // Reset stars when opening PiP
      starsRef.current = [];
      frameCountRef.current = 0;

      // Create video if not exists
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.style.display = 'none';
        // CRITICAL: muted = false AND volume = 1.0 so macOS treats this as active media
        // The audio track itself is inaudible (0.0001 gain), so no sound is heard
        video.muted = false;
        video.volume = 1.0;
        video.playsInline = true;
        video.autoplay = true;
        document.body.appendChild(video);
        videoRef.current = video;
        console.log('🎬 PiP: Video element created with muted=false, volume=1.0');
      }

      stateRef.current = state;
      flashPhaseRef.current = 0;

      // Start rendering to canvas
      startRenderLoop();

      // 1. Get video track from canvas
      const canvasStream = canvasRef.current.captureStream(30);
      const videoTrack = canvasStream.getVideoTracks()[0];

      // 2. Create silent audio track (tricks macOS)
      const audioTrack = createAudioTrack();

      // 3. Combine video + audio into single stream
      const combinedTracks: MediaStreamTrack[] = [videoTrack];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      videoRef.current.srcObject = combinedStream;

      // Resume audio context if suspended (browser policy)
      if (audioContextRef.current?.state === 'suspended') {
        console.log('🔊 PiP: Resuming suspended audio context...');
        await audioContextRef.current.resume();
      }

      console.log('🔊 PiP: Audio context state:', audioContextRef.current?.state);
      console.log('🔊 PiP: Video muted:', videoRef.current.muted);
      console.log('🔊 PiP: Stream tracks:', combinedStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

      await videoRef.current.play();

      // Request PiP
      await videoRef.current.requestPictureInPicture();
      setIsPiPOpen(true);
      console.log('✅ PiP: Opened successfully with audio track');

      // Handle PiP close
      videoRef.current.addEventListener('leavepictureinpicture', () => {
        setIsPiPOpen(false);
        stopRenderLoop();
        // Cleanup audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      }, { once: true });

    } catch (error) {
      console.error('Failed to open Video PiP:', error);
      stopRenderLoop();
    }
  }, [isSupported, startRenderLoop, stopRenderLoop, createAudioTrack]);

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
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
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
