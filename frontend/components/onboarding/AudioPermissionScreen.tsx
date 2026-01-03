'use client';

import { motion } from 'framer-motion';
// [핵심] 새로운 SoundManager 사용 (Web Audio API 기반)
import { soundManager } from '@/lib/SoundManager';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {

  // 클릭/터치 핸들러 통합
  const handleInteraction = async (e?: React.MouseEvent | React.TouchEvent) => {
    console.log('🔊 Audio permission interaction - UNLOCKING NOW');

    try {
      // [CRITICAL] 동기적으로 오디오 시스템 초기화 및 언락
      // 이 코드는 반드시 클릭 이벤트 핸들러 내에서 즉시 실행되어야 함
      // iOS/Android 브라우저가 "사용자 제스처"로 인식하는 타이밍 내에 완료
      soundManager.init(); // 컨텍스트 초기화
      await soundManager.unlockAudio(); // 무음 버퍼 재생으로 오디오 채널 활성화

      console.log('✅ Audio unlocked successfully in click handler');
    } catch (err) {
      console.error("❌ Audio unlock failed:", err);
    }

    // 오디오 언락 완료 후 UI 전환
    onAllow();
  };

  return (
    <div
      className="min-h-screen w-full bg-black flex items-center justify-center cursor-pointer"
      // onClick과 onTouchEnd 모두 같은 핸들러 연결
      onClick={(e) => handleInteraction(e)}
      // onTouchEnd에서 e.preventDefault()를 쓰면
      // BackgroundMusicPlayer의 document 'click' 리스너가 동작 안 할 수 있으니 주의해야 합니다.
      // 여기서는 명시적으로 핸들러만 호출합니다.
      onTouchEnd={() => handleInteraction()}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
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
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 1.5 }}
          className="text-2xl font-bold text-white"
        >
          CLICK ME
        </motion.p>
      </motion.div>
    </div>
  );
}
