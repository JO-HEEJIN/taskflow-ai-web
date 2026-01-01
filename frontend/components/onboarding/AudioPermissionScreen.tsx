'use client';

import { motion } from 'framer-motion';
// [추가] soundManager import
import { soundManager } from '@/lib/sounds';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {

  // 클릭/터치 핸들러 통합
  const handleInteraction = async (e?: React.MouseEvent | React.TouchEvent) => {
    // 아이폰의 경우 preventDefault()가 클릭 이벤트를 막아버려
    // 오디오 언락에 방해가 될 수 있으므로, 꼭 필요한 경우가 아니면 제거하거나 주의해야 합니다.
    // 여기서는 안전하게 오디오 언락을 먼저 실행합니다.

    console.log('Audio permission interaction');

    // [핵심 수정] 효과음 오디오 시스템 잠금 해제
    try {
        await soundManager.unlockAudio();
    } catch (err) {
        console.error("Audio unlock failed", err);
    }

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
          YES
        </motion.p>
      </motion.div>
    </div>
  );
}
