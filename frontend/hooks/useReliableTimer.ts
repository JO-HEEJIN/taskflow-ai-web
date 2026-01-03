import { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '@/lib/SoundManager';

interface TimerProps {
  durationMinutes: number;
  subtaskId: string; // 서브타스크 ID를 키로 사용하여 리셋 감지
  taskId: string;
  onComplete: () => void;
}

export function useReliableTimer({ durationMinutes, subtaskId, taskId, onComplete }: TimerProps) {
  // 목표 종료 시간 (Unix Timestamp)
  const [targetTime, setTargetTime] = useState<number | null>(null);
  // UI 표시용 남은 시간 (초)
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  // 중복 완료 방지를 위한 Ref
  const isCompletedRef = useRef(false);

  // 1. 서브타스크가 변경되면 타이머 초기화 (절대적 리셋)
  useEffect(() => {
    console.log(`⏰ Timer Reset for subtask: ${subtaskId}`);
    isCompletedRef.current = false; // 완료 플래그 초기화

    const durationSec = durationMinutes * 60;
    setTimeLeft(durationSec); // UI 즉시 반영

    // 목표 시간 설정: 현재시간 + 지속시간
    const now = Date.now();
    const newTarget = now + (durationSec * 1000);
    setTargetTime(newTarget);
    setIsRunning(false); // 기본값은 일시정지 (사용자가 명시적으로 시작해야 함)

    console.log(`⏰ Timer Initialized for ${subtaskId}: Target ${new Date(newTarget).toLocaleTimeString()}, Duration: ${durationMinutes}min`);
  }, [subtaskId, durationMinutes]); // 서브타스크 ID가 바뀌면 무조건 실행

  // 2. 틱(Tick) 루프: requestAnimationFrame과 유사한 보정 로직
  useEffect(() => {
    if (!isRunning || !targetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // 남은 시간 = 목표 시간 - 현재 시간
      const remaining = Math.ceil((targetTime - now) / 1000);

      if (remaining <= 0) {
        // 타이머 종료
        setTimeLeft(0);
        setIsRunning(false);
        clearInterval(interval);

        // 중복 실행 방지 (Strict Mode나 빠른 리렌더링 방어)
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          handleCompletion();
        }
      } else {
        // 정상 진행
        setTimeLeft(remaining);
      }
    }, 100); // 1초보다 짧게 설정하여 UI 반응성 향상 (0.1초마다 체크)

    return () => clearInterval(interval);
  }, [isRunning, targetTime]);

  // 3. 완료 처리 핸들러
  const handleCompletion = useCallback(() => {
    console.log("🎉 Timer Completed!");

    // 오디오 재생 (SoundManager 사용)
    soundManager.play('timer-complete');

    // 진동 (모바일 지원 시)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // 부모 컴포넌트의 완료 로직 호출
    onComplete();
  }, [onComplete]);

  // 타이머 시작/재개 함수
  const startTimer = useCallback(() => {
    if (!targetTime) return;

    // 일시정지 상태에서 재개하는 경우, 새로운 목표 시간 계산
    if (!isRunning && timeLeft > 0) {
      const now = Date.now();
      const newTarget = now + (timeLeft * 1000);
      setTargetTime(newTarget);
      console.log(`▶️  Timer Started: Target ${new Date(newTarget).toLocaleTimeString()}`);
    }

    setIsRunning(true);
  }, [isRunning, timeLeft, targetTime]);

  // 타이머 일시정지 함수
  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    console.log('⏸️  Timer Paused');
  }, []);

  // 타이머 토글 함수
  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  return {
    timeLeft,
    isRunning,
    startTimer,
    pauseTimer,
    toggleTimer
  };
}
