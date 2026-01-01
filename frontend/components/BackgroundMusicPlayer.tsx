'use client';

import { useEffect, useRef } from 'react';
import { useCoachStore } from '@/store/useCoachStore';

export function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isFocusMode } = useCoachStore();

  useEffect(() => {
    // 음악 설정 확인
    const continuousMusicEnabled = localStorage.getItem('continuousMusicEnabled');
    if (continuousMusicEnabled !== 'true') {
      return;
    }

    // 오디오 인스턴스 생성
    const audio = new Audio('/sounds/TaskFlow_Theme.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // [핵심 수정] 재생 시도 및 아이폰용 언락(Unlock) 로직
    const attemptPlay = async () => {
      try {
        await audio.play();
        // 재생 성공 시 리스너 제거 (더 이상 필요 없음)
        document.removeEventListener('touchstart', attemptPlay);
        document.removeEventListener('click', attemptPlay);
        console.log('✅ BGM Started');
      } catch (error) {
        console.log('waiting for interaction to play bgm...');
      }
    };

    // 1. 로드 되자마자 일단 시도 (PC/안드로이드용)
    attemptPlay();

    // 2. 아이폰/모바일용: 화면을 터치하는 순간 강제로 재생 시도
    // (options: { capture: true }를 써서 이벤트가 버블링 되기 전에 잡아챕니다)
    document.addEventListener('touchstart', attemptPlay, { capture: true, once: true });
    document.addEventListener('click', attemptPlay, { capture: true, once: true });

    // 토글 이벤트 리스너
    const handleToggle = (event: CustomEvent) => {
      if (event.detail.enabled) {
        // 여기서도 바로 play() 시도
        audio.play().catch(console.error);

        // 만약 토글 순간에도 막힌다면 다시 리스너 부착
        document.addEventListener('touchstart', attemptPlay, { capture: true, once: true });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    window.addEventListener('continuousMusicToggle', handleToggle as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('continuousMusicToggle', handleToggle as EventListener);
      document.removeEventListener('touchstart', attemptPlay);
      document.removeEventListener('click', attemptPlay);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // 포커스 모드 시 일시정지 로직
  useEffect(() => {
    if (!audioRef.current) return;

    if (isFocusMode) {
      audioRef.current.pause();
    } else {
      const continuousMusicEnabled = localStorage.getItem('continuousMusicEnabled');
      if (continuousMusicEnabled === 'true') {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [isFocusMode]);

  return null;
}
