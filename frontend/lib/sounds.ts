/**
 * Sound Manager (Singleton Pattern)
 * Handles audio playback for timer events with guaranteed persistence
 */

class SoundManager {
  private static instance: SoundManager | null = null;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private audioUnlocked: boolean = false;
  private timerCompletionAudio: HTMLAudioElement | null = null;

  // Private constructor for Singleton
  private constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize audio context (needed for some browsers)
   */
  private initAudioContext() {
    if (typeof window === 'undefined') return;

    if (!this.audioContext) {
      // @ts-ignore - AudioContext or webkitAudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Unlock audio on mobile browsers (requires user interaction)
   * MUST be called on Focus Mode Start button click
   */
  async unlock(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.audioUnlocked) {
      console.log('🔓 Audio already unlocked');
      return;
    }

    this.initAudioContext();

    // Play a silent audio to unlock (mobile requirement)
    try {
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.volume = 0;
      silentAudio.muted = true;
      await silentAudio.play();
      silentAudio.pause();
      silentAudio.remove();

      // Also unlock timer completion audio
      if (!this.timerCompletionAudio) {
        this.timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
      }
      this.timerCompletionAudio.volume = 0;
      this.timerCompletionAudio.muted = true;
      await this.timerCompletionAudio.play();
      this.timerCompletionAudio.pause();
      this.timerCompletionAudio.currentTime = 0;
      this.timerCompletionAudio.muted = false;
      this.timerCompletionAudio.volume = 0.7;

      this.audioUnlocked = true;
      console.log('✅ Audio unlocked for mobile (including timer-complete.mp3)');
    } catch (error) {
      console.warn('Failed to unlock audio:', error);
    }
  }

  /**
   * Legacy compatibility
   */
  async unlockAudio(): Promise<void> {
    return this.unlock();
  }

  /**
   * Preload a sound file
   */
  async preload(soundId: string, url: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio(url);
      audio.preload = 'auto';

      // Wait for audio to be loaded
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
      });

      this.sounds.set(soundId, audio);
      console.log(`✅ Sound preloaded: ${soundId}`);
    } catch (error) {
      console.info(`ℹ️ Sound file not found: ${soundId} (will use generated chime fallback)`);
    }
  }

  /**
   * Play a sound
   */
  async play(soundId: string, volume: number = 0.7): Promise<void> {
    if (typeof window === 'undefined') return;

    // Ensure audio is unlocked before playing (mobile requirement)
    await this.unlockAudio();
    this.initAudioContext();

    try {
      let audio = this.sounds.get(soundId);

      if (!audio) {
        console.warn(`Sound not preloaded: ${soundId}, loading now...`);
        return;
      }

      // Clone the audio element to allow overlapping plays
      const audioClone = audio.cloneNode(true) as HTMLAudioElement;
      audioClone.volume = volume;

      await audioClone.play();
      console.log(`🔊 Playing sound: ${soundId}`);

      // Clean up after playing
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });
    } catch (error) {
      console.error(`❌ Failed to play sound: ${soundId}`, error);
    }
  }

  /**
   * Play timer completion sound (CRITICAL PATH)
   * Uses pre-loaded audio instance for guaranteed playback
   */
  async playTimerComplete(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Resume AudioContext if suspended (helps with background tab playback)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Use pre-loaded instance (unlocked during focus mode start)
      if (!this.timerCompletionAudio) {
        console.warn('⚠️ Timer completion audio not pre-loaded! Creating on-demand (may fail on iOS)');
        this.timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
        this.timerCompletionAudio.volume = 0.7;
      }

      // Ensure unmuted and correct volume
      this.timerCompletionAudio.muted = false;
      this.timerCompletionAudio.volume = 0.7;

      // Reset to beginning and play
      this.timerCompletionAudio.currentTime = 0;
      await this.timerCompletionAudio.play();
      console.log('🔊 Timer completion sound played (Singleton)');
    } catch (error) {
      console.warn('❌ Audio file failed, using Web Audio API beep:', error);
      // Fallback to beep
      try {
        await this.playCompletionChime();
      } catch (beepError) {
        console.error('❌ Failed to play any completion sound:', beepError);
      }
    }
  }

  /**
   * Play timer start sound (optional)
   */
  async playTimerStart(): Promise<void> {
    await this.play('timer-start', 0.5);
  }

  /**
   * Play timer pause sound (optional)
   */
  async playTimerPause(): Promise<void> {
    await this.play('timer-pause', 0.3);
  }

  /**
   * Generate a simple beep sound using Web Audio API
   * Fallback if audio file not available
   */
  async playBeep(frequency: number = 800, duration: number = 200): Promise<void> {
    if (typeof window === 'undefined') return;

    this.initAudioContext();

    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration / 1000
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);

      console.log(`🔊 Playing beep: ${frequency}Hz`);
    } catch (error) {
      console.error('Failed to play beep:', error);
    }
  }

  /**
   * Play completion chime (multiple beeps)
   */
  async playCompletionChime(): Promise<void> {
    // Play a pleasant chime sequence
    await this.playBeep(523, 150); // C5
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playBeep(659, 150); // E5
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playBeep(784, 300); // G5
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.sounds.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

// Export singleton instance (legacy compatibility)
export const soundManager = SoundManager.getInstance();

// Global timer completion audio instance for iOS unlock
let timerCompletionAudio: HTMLAudioElement | null = null;

/**
 * Initialize sound manager with preloaded sounds
 */
export async function initSounds(): Promise<void> {
  // Preload timer completion sound
  await soundManager.preload('timer-complete', '/sounds/timer-complete.mp3');

  // Optional: Preload other sounds
  // await soundManager.preload('timer-start', '/sounds/timer-start.mp3');
  // await soundManager.preload('timer-pause', '/sounds/timer-pause.mp3');
}

/**
 * Unlock timer completion audio for iOS
 * MUST be called during a user gesture (click, touch)
 */
export function unlockTimerCompletionAudio(): void {
  if (typeof window === 'undefined') return;

  // Create global audio instance if not exists
  if (!timerCompletionAudio) {
    timerCompletionAudio = new Audio('/sounds/timer-complete.mp3');
  }

  // Unlock with silent play
  timerCompletionAudio.volume = 0;
  timerCompletionAudio.muted = true;
  timerCompletionAudio.play().then(() => {
    timerCompletionAudio!.pause();
    timerCompletionAudio!.currentTime = 0;
    timerCompletionAudio!.muted = false;
    timerCompletionAudio!.volume = 0.7;
    console.log('Timer completion sound unlocked for iOS');
  }).catch(err => console.warn('Failed to unlock timer sound:', err));
}

/**
 * Play timer completion sound with GUARANTEED execution
 * This is called DIRECTLY from OrbitTimer BEFORE state updates
 * SOUND-FIRST, STATE-SECOND architecture
 */
export function playTimerCompletionSound(): void {
  const manager = SoundManager.getInstance();

  // Fire and forget - don't wait for Promise
  manager.playTimerComplete().catch(error => {
    console.error('❌ Timer completion sound failed:', error);
  });
}

/**
 * Unlock audio for mobile browsers
 * Call this on first user interaction
 */
export async function unlockAudioForMobile(): Promise<void> {
  await soundManager.unlockAudio();
}
