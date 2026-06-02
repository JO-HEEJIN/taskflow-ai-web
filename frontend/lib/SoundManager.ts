/**
 * 모바일 브라우저의 자동 재생 정책을 우회하고
 * 앱 전역에서 오디오 상태를 관리하는 강력한 SoundManager입니다.
 */
class SoundManager {
  private static instance: SoundManager;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private isUnlocked: boolean = false;
  private heartbeatInterval: number | null = null; // iOS 절전 방지 heartbeat

  // 사용자가 제공한 정확한 파일 경로 매핑
  private soundManifest = {
    'timer-complete': '/sounds/timer-complete.mp3', // 알림음
    'theme': '/sounds/TaskFlow_Theme.mp3'           // 배경음
  };

  private constructor() {
    // 생성자에서는 아무것도 하지 않음 (브라우저 환경 체크 후 init)
  }

  // 싱글톤 인스턴스 반환
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * 오디오 시스템 초기화
   * 페이지 로드 시 호출하되, 실제 언락은 사용자 인터랙션 시 수행됨
   */
  public init() {
    if (typeof window === 'undefined') return;

    // 크로스 브라우저 호환성 (Safari 구버전 대응)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API is not supported in this browser.");
      return;
    }

    // 이미 컨텍스트가 있다면 재사용
    if (!this.context) {
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      // 파일 미리 로딩 (Preload)
      this.preloadSounds();
    }
  }

  /**
   * [핵심] 오디오 언락 메서드 - iOS Asset Warm-up Pattern
   * 반드시 "CLICK ME" 버튼의 onClick 핸들러에서 동기적으로 호출되어야 함
   */
  public async unlockAudio() {
    if (!this.context) this.init();
    if (!this.context) return;

    console.log('🔑 Starting iOS-compatible audio unlock with Asset Warm-up...');

    // 1. Suspended 상태라면 Resume 시도
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
        console.log('🔄 AudioContext resumed from suspended state');
      } catch (e) {
        console.error("Audio resume failed:", e);
      }
    }

    // 2. 무음 버퍼 재생 (컨텍스트 언락)
    const silentBuffer = this.context.createBuffer(1, 1, 22050);
    const silentSource = this.context.createBufferSource();
    silentSource.buffer = silentBuffer;
    silentSource.connect(this.context.destination);
    silentSource.start(0);
    console.log('✅ Silent buffer played (context unlocked)');

    // 3. [iOS FIX] Asset Warm-up: timer-complete.mp3를 볼륨 0으로 짧게 재생
    // iOS는 "이 파일도 user interaction 때 재생했니?"를 검사함
    try {
      const timerBuffer = this.buffers.get('timer-complete');

      if (timerBuffer) {
        // 버퍼가 이미 로드됨 - 즉시 warm-up
        console.log('🔥 Warming up timer-complete asset for iOS...');
        const warmupSource = this.context.createBufferSource();
        warmupSource.buffer = timerBuffer;

        // 볼륨 0으로 설정 (유저는 못 들음)
        const warmupGain = this.context.createGain();
        warmupGain.gain.value = 0;

        warmupSource.connect(warmupGain);
        warmupGain.connect(this.context.destination);

        // 0.001초만 재생 (iOS whitelisting 목적)
        warmupSource.start(0);
        warmupSource.stop(0.001);

        console.log('✅ timer-complete.mp3 warmed up successfully');
      } else {
        // 버퍼가 아직 로드 안 됨 - 긴급 로드 후 warm-up
        console.warn('⚠️ timer-complete not preloaded yet, loading now...');
        const url = this.soundManifest['timer-complete'];
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set('timer-complete', audioBuffer);

        // 로드 완료 후 warm-up
        console.log('🔥 Emergency loading + warming up timer-complete...');
        const warmupSource = this.context.createBufferSource();
        warmupSource.buffer = audioBuffer;

        const warmupGain = this.context.createGain();
        warmupGain.gain.value = 0;

        warmupSource.connect(warmupGain);
        warmupGain.connect(this.context.destination);

        warmupSource.start(0);
        warmupSource.stop(0.001);

        console.log('✅ Emergency timer-complete loaded and warmed up');
      }
    } catch (warmupError) {
      console.error('❌ Asset warm-up failed (iOS playback may not work):', warmupError);
    }

    this.isUnlocked = true;
    console.log("🔊 Audio Engine Fully Unlocked (iOS Asset Warm-up Complete)");
  }

  /**
   * 사운드 파일 미리 로드 및 디코딩
   * HTML5 Audio 태그 대신 AudioBuffer를 사용하여 메모리에 PCM 데이터로 저장
   * -> 재생 지연(Latency) 제거
   */
  private async preloadSounds() {
    if (!this.context) return;

    for (const [key, url] of Object.entries(this.soundManifest)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        // 비동기 디코딩
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
        console.log(`✅ Sound loaded: ${key}`);
      } catch (e) {
        console.error(`❌ Failed to load sound: ${key}`, e);
      }
    }
  }

  /**
   * 사운드 재생 메서드 (iOS 호환)
   * @param key 사운드 키 ('timer-complete' | 'theme')
   * @param loop 반복 재생 여부
   * @param volume 볼륨 (0.0 ~ 1.0)
   */
  public async play(key: string, loop: boolean = false, volume: number = 1.0): Promise<AudioBufferSourceNode | undefined> {
    // Auto-initialize if not done
    if (!this.context || !this.masterGain) {
      console.log('🔧 AudioContext not initialized, initializing now...');
      this.init();
    }

    if (!this.context || !this.masterGain) {
      console.error('❌ Failed to initialize AudioContext');
      // Fallback to HTMLAudioElement
      await this.playFallback(key, volume);
      return;
    }

    // [iOS FIX] 타이머 완료 시점에 AudioContext가 suspended 상태일 수 있음
    // 반드시 resume을 AWAIT 해야 iOS에서 재생됨
    if (this.context.state === 'suspended') {
      console.log('⚠️ AudioContext suspended, resuming...');
      try {
        await this.context.resume();
        console.log('✅ AudioContext resumed, state:', this.context.state);
      } catch (e) {
        console.error('❌ Failed to resume AudioContext:', e);
        // Try fallback
        await this.playFallback(key, volume);
        return;
      }
    }

    let buffer = this.buffers.get(key);

    // If buffer not loaded, try to load it now
    if (!buffer) {
      console.log(`⏳ Sound ${key} not preloaded, loading now...`);
      const url = this.soundManifest[key as keyof typeof this.soundManifest];
      if (url) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await this.context.decodeAudioData(arrayBuffer);
          this.buffers.set(key, buffer);
          console.log(`✅ Sound ${key} loaded on-demand`);
        } catch (e) {
          console.error(`❌ Failed to load sound ${key} on-demand:`, e);
          // Fallback to HTMLAudioElement
          await this.playFallback(key, volume);
          return;
        }
      } else {
        console.warn(`❌ Unknown sound key: ${key}`);
        return;
      }
    }

    try {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;

      // 개별 볼륨 조절을 위한 GainNode
      const gainNode = this.context.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start(0);
      console.log(`🔊 Playing sound: ${key} (loop: ${loop}, volume: ${volume})`);

      return source; // 제어(중지 등)를 위해 소스 반환
    } catch (e) {
      console.error(`❌ Failed to play sound via Web Audio API:`, e);
      await this.playFallback(key, volume);
      return;
    }
  }

  /**
   * Fallback to HTMLAudioElement when Web Audio API fails
   */
  private async playFallback(key: string, volume: number = 1.0): Promise<void> {
    const url = this.soundManifest[key as keyof typeof this.soundManifest];
    if (!url) {
      console.warn(`❌ Unknown sound key for fallback: ${key}`);
      return;
    }

    console.log(`🔄 Using HTMLAudioElement fallback for ${key}`);
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      await audio.play();
      console.log(`✅ Fallback sound played: ${key}`);
    } catch (e) {
      console.error(`❌ Fallback playback also failed:`, e);
    }
  }

  /**
   * 모든 사운드 정지
   */
  public stopAll() {
    // AudioContext를 일시 중단하여 모든 재생 중지
    if (this.context && this.context.state === 'running') {
      this.context.suspend();
    }
  }

  /**
   * [iOS FIX] Heartbeat 시작 - 타이머 실행 중 절전 모드 방지
   * 10초마다 짧은 무음 신호를 발생시켜 AudioContext가 active 상태를 유지하게 함
   */
  public startHeartbeat() {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      console.warn('AudioContext not initialized, cannot start heartbeat');
      return;
    }

    // 이미 heartbeat이 실행 중이면 기존 인터벌을 정리하고 새로 시작 (stale interval 방지)
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    console.log('💓 Starting audio heartbeat (iOS sleep prevention)');

    // 10초마다 무음 버퍼 재생
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.context || this.context.state !== 'running') {
        console.log('⚠️ AudioContext not running, attempting resume in heartbeat...');
        this.context?.resume().catch(() => {});
      }

      // 0.001초 무음 버퍼 재생 (브라우저에게 "사용 중" 신호)
      const silentBuffer = this.context!.createBuffer(1, 1, 22050);
      const source = this.context!.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.context!.destination);
      source.start(0);

      console.log('💓 Heartbeat tick (keeping AudioContext alive)');
    }, 10000); // 10초마다

    console.log('✅ Heartbeat started (interval every 10s)');
  }

  /**
   * Heartbeat 중지
   */
  public stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heartbeat stopped');
    }
  }

  /**
   * 언락 상태 확인
   */
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
}

export const soundManager = SoundManager.getInstance();
