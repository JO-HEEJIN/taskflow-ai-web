'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
// [핵심] 새로운 SoundManager 사용 (Web Audio API 기반)
import { soundManager } from '@/lib/SoundManager';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 클릭/터치 핸들러 통합 - 옵션 3: 병렬 처리
  const handleInteraction = async (e?: React.MouseEvent | React.TouchEvent) => {
    console.log('🔊 Audio permission interaction - UNLOCKING NOW');

    // 로딩 상태 즉시 표시 (사용자 피드백)
    setIsUnlocking(true);

    try {
      // [CRITICAL] 동기적으로 오디오 시스템 초기화 및 언락
      soundManager.init(); // 컨텍스트 초기화

      // 병렬 처리: 사운드 언락 + 최소 애니메이션 시간
      await Promise.all([
        soundManager.unlockAudio(), // 무음 버퍼 재생으로 오디오 채널 활성화
        new Promise(resolve => setTimeout(resolve, 200)) // 최소 200ms 애니메이션
      ]);

      console.log('✅ Audio unlocked successfully in click handler');
    } catch (err) {
      console.error("❌ Audio unlock failed:", err);
    }

    // 병렬 처리 완료 후 UI 전환
    onAllow();
  };

  return (
    <div
      className="min-h-screen w-full bg-black flex items-center justify-center cursor-pointer"
      // onClick과 onTouchEnd 모두 같은 핸들러 연결
      onClick={(e) => !isUnlocking && handleInteraction(e)}
      // onTouchEnd에서 e.preventDefault()를 쓰면
      // BackgroundMusicPlayer의 document 'click' 리스너가 동작 안 할 수 있으니 주의해야 합니다.
      // 여기서는 명시적으로 핸들러만 호출합니다.
      onTouchEnd={() => !isUnlocking && handleInteraction()}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isUnlocking ? 0 : 1 }}
        transition={{ duration: isUnlocking ? 0.3 : 1.5 }}
        className="max-w-md w-full px-6 text-center"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="text-4xl md:text-5xl font-bold text-white mb-12"
        >
          Do you want to outdo yourself?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: isUnlocking ? 0.9 : 1
          }}
          transition={{ delay: 1.0, duration: isUnlocking ? 0.2 : 1.5 }}
          className="text-2xl font-bold text-white"
        >
          {isUnlocking ? 'UNLOCKING...' : 'CLICK ME'}
        </motion.p>
      </motion.div>
    </div>
  );
}
