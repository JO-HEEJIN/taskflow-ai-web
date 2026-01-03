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
   * [핵심] 오디오 언락 메서드
   * 반드시 "CLICK ME" 버튼의 onClick 핸들러에서 동기적으로 호출되어야 함
   */
  public async unlockAudio() {
    if (!this.context) this.init();
    if (!this.context) return;

    // 1. Suspended 상태라면 Resume 시도
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
        console.log('🔄 AudioContext resumed from suspended state');
      } catch (e) {
        console.error("Audio resume failed:", e);
      }
    }

    // 2. 무음 버퍼 재생 (가장 중요한 단계)
    // 짧은 무음을 재생하여 오디오 채널을 강제로 엽니다.
    const buffer = this.context.createBuffer(1, 1, 22050);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.start(0);

    this.isUnlocked = true;
    console.log("🔊 Audio Engine Unlocked: Ready to play on mobile.");
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
   * 사운드 재생 메서드
   * @param key 사운드 키 ('timer-complete' | 'theme')
   * @param loop 반복 재생 여부
   * @param volume 볼륨 (0.0 ~ 1.0)
   */
  public play(key: string, loop: boolean = false, volume: number = 1.0) {
    if (!this.context || !this.masterGain) {
      console.warn('AudioContext not initialized. Call init() first.');
      return;
    }

    // 안전장치: 혹시라도 Context가 다시 중단되었다면 재시도
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }

    const buffer = this.buffers.get(key);
    if (!buffer) {
      console.warn(`Sound ${key} not loaded yet.`);
      return;
    }

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
   * 언락 상태 확인
   */
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
}

export const soundManager = SoundManager.getInstance();
