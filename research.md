# tutor-skills → TaskFlow AI 통합 리서치

## 1. tutor-skills 개요

**GitHub**: https://github.com/RoundTable02/tutor-skills
**라이선스**: MIT
**구조**: Claude Code Skill 2개 (`/tutor-setup`, `/tutor`)

### 핵심 컨셉
- PDF/문서/코드베이스 → 구조화된 학습 노트(Obsidian vault) 자동 생성
- 적응형 퀴즈 → 약점 파악 → 드릴 반복 → 숙련도 추적
- "모르는 걸 모르는" 문제를 해결하는 메타인지 학습 시스템

---

## 2. tutor-skills 상세 분석

### 2.1 `/tutor-setup` — 학습 자료 → 구조화된 노트

**Document Mode (9단계):**
1. D1: 소스 파일 탐색 & 콘텐츠 매핑 (PDF → pdftotext로 추출)
2. D2: 토픽 분석 & 체크리스트 생성
3. D3: 태그 표준화 (English, kebab-case)
4. D4: 폴더 구조 생성
5. D5: 대시보드 생성 (MOC, Quick Reference, Exam Traps)
6. D6: 개념 노트 생성 (개요표, 핵심 설명 3-5줄, 시험 패턴, 관련 노트)
7. D7: 연습 문제 생성 (폴더당 8+, 유형 다양화)
8. D8: 상호 링크 (wiki-links)
9. D9: 품질 검수 (체크리스트 기반)

**Codebase Mode (9단계):**
- 아키텍처 분석 → 모듈별 문서화 → 온보딩 연습문제 생성

**핵심 템플릿:**
- Dashboard MOC: 토픽 맵 + 연습 인덱스 + 시험 함정 + 약점 체크리스트
- Quick Reference: 한 줄 요약 테이블, 공식, 패턴
- Exam Traps: 자주 틀리는 함정 모음 (`[!danger]` callout)
- Concept Note: 개요표 + 설명(3-5줄) + 시험 패턴 + 관련 노트
- Practice Questions: 8+문제, 접이식 정답 (`[!answer]- 정답 보기`)

### 2.2 `/tutor` — 적응형 퀴즈 시스템

**세션 유형:**
| 유형 | 설명 | 난이도 배분 |
|---|---|---|
| Diagnostic | 아직 측정 안 된 개념 진단 | Easy 40% / Medium 40% / Hard 20% |
| Drill Weak | 약점 집중 드릴 | Medium 30% / Hard 70% |
| Choose Section | 특정 섹션 선택 학습 | 균등 배분 |
| Hard-mode Review | 이미 마스터한 개념 도전 | 고난이도 위주 |

**퀴즈 규칙 (quiz-rules.md):**
- 라운드당 4문제, 문제당 4지선다
- Zero-Hint Policy: 옵션 설명이 정답을 암시하면 안 됨
- 정답 위치 랜덤화
- 5가지 문제 유형: 사실 회상, 개념 이해, 행동 예측, 비교, 디버깅 시나리오
- 오답 드릴: 같은 개념을 **다른 맥락**으로 재출제 (단순 반복 X)

**숙련도 추적:**
- 🟥 Weak (0-39%) / 🟨 Fair (40-69%) / 🟩 Good (70-89%) / 🟦 Mastered (90-100%) / ⬜ Unmeasured
- 개념별: 시도 횟수, 정답 수, 마지막 테스트 일시, 오답 노트
- 대시보드: 전체 통계 집계 + 숙련도 배지

---

## 3. TaskFlow AI 현재 학습 기능 현황

### 이미 있는 것
- **PDF 챕터 추출**: `claudeService.ts` — Claude로 교재에서 챕터 구조 추출
- **Study Mode 감지**: 한/영 키워드로 학습 태스크 자동 감지
- **Learning Architect 프롬프트**: Study Mode 시 active learning 기반 서브태스크 생성
- **8가지 학습 전략**: active_recall, feynman, blurting, interleaving, priming, elaboration, concrete_analogy, spaced_repetition
- **인터랙션 타입**: checkbox, text_input, voice_input, quiz, confidence_rating
- **SRS 신뢰도**: Red(20분) / Yellow(1일) / Green(3일) 복습 간격
- **Focus Mode**: 몰입 타이머, 격려 메시지, 코치 챗

### 없는 것 (tutor-skills에서 가져올 핵심)
1. **구조화된 개념 노트 생성** — 현재는 서브태스크 리스트만 생성
2. **적응형 퀴즈 시스템** — quiz 타입이 정의만 되어 있고 실제 퀴즈 UI/로직 없음
3. **개념별 숙련도 추적** — 현재는 서브태스크 단위 신뢰도만
4. **진단 모드** — 학습 전 약점 파악 기능 없음
5. **오답 기반 재출제** — 같은 개념을 다른 맥락으로 드릴하는 로직 없음
6. **숙련도 대시보드** — 개념별 Weak/Fair/Good/Mastered 시각화 없음

---

## 4. 통합 설계

### 4.1 데이터 모델 확장

```typescript
// 새로 추가할 타입들

interface Concept {
  id: string;
  taskId: string;           // 소속 학습 태스크
  name: string;             // 개념 이름
  description?: string;     // 개념 설명
  tags: string[];           // kebab-case 태그

  // 숙련도 추적
  totalAttempts: number;
  correctCount: number;
  proficiency: 'weak' | 'fair' | 'good' | 'mastered' | 'unmeasured';
  lastTestedAt?: string;
  errorNotes: string[];     // 오답 시 기록

  // SRS
  nextReviewAt?: string;
  reviewInterval: number;   // 분 단위
}

interface Quiz {
  id: string;
  taskId: string;
  conceptId: string;
  sessionType: 'diagnostic' | 'drill_weak' | 'section' | 'hard_review';

  question: string;
  options: string[];        // 4지선다
  correctIndex: number;
  questionType: 'recall' | 'understanding' | 'prediction' | 'comparison' | 'debugging';
  difficulty: 'easy' | 'medium' | 'hard';

  // 결과
  userAnswer?: number;
  isCorrect?: boolean;
  explanation?: string;
  answeredAt?: string;
}

interface QuizSession {
  id: string;
  taskId: string;
  sessionType: 'diagnostic' | 'drill_weak' | 'section' | 'hard_review';
  quizzes: Quiz[];
  completedAt?: string;
  score: number;            // 정답률 %
}
```

### 4.2 AI 프롬프트 추가 (azureOpenAIService.ts)

**1) 개념 추출 프롬프트**
- 학습 태스크 + 서브태스크에서 핵심 개념 리스트 추출
- 각 개념에 태그, 설명, 관련 서브태스크 매핑

**2) 퀴즈 생성 프롬프트**
- tutor-skills의 quiz-rules.md 기반
- 세션 유형별 난이도 배분 적용
- Zero-Hint Policy 준수
- 오답 드릴: 이전 오답 개념 + errorNotes를 컨텍스트로 전달 → 다른 맥락 문제 생성

**3) 진단 퀴즈 프롬프트**
- unmeasured 개념 대상
- 넓고 얕은 출제로 전체 약점 매핑

### 4.3 API 엔드포인트 추가

```
POST   /api/tasks/:taskId/concepts/extract     — AI 개념 추출
GET    /api/tasks/:taskId/concepts              — 개념 목록 조회
PATCH  /api/tasks/:taskId/concepts/:conceptId   — 개념 숙련도 업데이트

POST   /api/tasks/:taskId/quiz/generate         — 퀴즈 생성 (세션 유형 지정)
POST   /api/tasks/:taskId/quiz/submit           — 퀴즈 답안 제출 & 채점
GET    /api/tasks/:taskId/quiz/history           — 퀴즈 이력 조회

GET    /api/tasks/:taskId/proficiency            — 숙련도 대시보드 데이터
GET    /api/tasks/:taskId/review-due             — SRS 복습 필요한 개념 목록
```

### 4.4 프론트엔드 UI

**1) Focus Mode 퀴즈 뷰 (GalaxyFocusView 확장)**
```
┌─────────────────────────────────┐
│  📚 Chapter 3: HTTP Methods     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                 │
│  Q2/4  [understanding]          │
│                                 │
│  PUT과 PATCH의 차이점으로       │
│  올바른 것은?                   │
│                                 │
│  ○ A) PUT은 부분 업데이트       │
│  ○ B) PATCH는 전체 교체         │
│  ● C) PUT은 멱등성 보장         │
│  ○ D) 둘 다 멱등성 없음         │
│                                 │
│  [제출]                         │
│                                 │
│  진행: ██████░░ 2/4             │
└─────────────────────────────────┘
```

**2) 숙련도 대시보드 (TaskDetail 확장)**
```
┌─────────────────────────────────┐
│  숙련도 현황                     │
│                                 │
│  🟦 HTTP Methods      95%  ████│
│  🟩 REST Principles   78%  ███░│
│  🟨 Status Codes      52%  ██░░│
│  🟥 Authentication    23%  █░░░│
│  ⬜ WebSocket          --  ░░░░│
│                                 │
│  [진단 퀴즈 시작] [약점 드릴]    │
└─────────────────────────────────┘
```

**3) 퀴즈 결과 뷰**
```
┌─────────────────────────────────┐
│  결과: 3/4 (75%)                │
│                                 │
│  ✅ Q1: HTTP Methods    [easy]  │
│  ✅ Q2: REST Principles [med]   │
│  ❌ Q3: Status Codes    [med]   │
│     → 422 vs 400 구분 필요      │
│  ✅ Q4: Authentication  [hard]  │
│                                 │
│  숙련도 변화:                    │
│  Status Codes: 🟨 52% → 🟨 48% │
│                                 │
│  [오답 드릴] [다음 세션]         │
└─────────────────────────────────┘
```

---

## 5. 구현 우선순위

### Phase 1: 핵심 퀴즈 시스템 (MVP)
1. [ ] Concept 데이터 모델 추가 (types + Cosmos DB)
2. [ ] AI 개념 추출 프롬프트 & API
3. [ ] AI 퀴즈 생성 프롬프트 & API (quiz-rules 기반)
4. [ ] 퀴즈 제출 & 채점 API
5. [ ] Focus Mode 퀴즈 UI

### Phase 2: 적응형 학습
6. [ ] 숙련도 추적 로직 (proficiency 계산)
7. [ ] 진단 모드 (unmeasured 개념 대상)
8. [ ] 오답 드릴 (다른 맥락 재출제)
9. [ ] SRS 복습 스케줄링

### Phase 3: 대시보드 & 고급 기능
10. [ ] 숙련도 대시보드 UI
11. [ ] 퀴즈 이력 & 학습 분석
12. [ ] Hard-mode Review
13. [ ] 교재 PDF → 개념 자동 추출 연동

---

## 6. tutor-skills에서 참고할 핵심 로직

### 6.1 Quiz Rules (그대로 적용)
- 라운드당 4문제, 4지선다, 단일 선택
- Zero-Hint Policy: 옵션이 정답을 암시하면 안 됨
- 정답 위치 랜덤화
- 문제 유형: recall, understanding, prediction, comparison, debugging
- 세션별 난이도 배분:
  - Diagnostic: Easy 40% / Medium 40% / Hard 20%
  - Drill Weak: Medium 30% / Hard 70%
  - Section: 균등
  - Hard Review: 고난이도 위주

### 6.2 Proficiency 계산
```
proficiency = correctCount / totalAttempts * 100

🟥 Weak:       0-39%
🟨 Fair:       40-69%
🟩 Good:       70-89%
🟦 Mastered:   90-100%
⬜ Unmeasured:  totalAttempts === 0
```

### 6.3 오답 드릴 전략
- 같은 문제 반복 X
- 동일 개념을 **다른 시나리오/맥락**으로 재출제
- 예: "HTTP 400 vs 422 구분" 오답 → 다른 API 시나리오에서 같은 구분 문제 출제
- 이전 errorNotes를 AI에 전달하여 학습자가 틀린 포인트를 정확히 겨냥

### 6.4 SRS 간격 (기존 TaskFlow 확장)
```
현재: Red(20분) / Yellow(1일) / Green(3일)

확장 제안:
- 🟥 Weak:     20분 후 복습
- 🟨 Fair:     1일 후 복습
- 🟩 Good:     3일 후 복습
- 🟦 Mastered: 7일 후 복습 (새로 추가)
- 연속 정답 시 간격 2배 증가 (SM-2 변형)
```

---

## 7. 기술적 고려사항

### Cosmos DB 스키마
- Concept은 Task 문서 내 embedded로 저장 (별도 컨테이너 X)
- Quiz/QuizSession은 별도 컨테이너 or Task 내 embedded (크기 고려)
- 파티션 키: syncCode (기존과 동일)

### AI 비용 최적화
- 개념 추출: 태스크 생성 시 1회만 (캐시)
- 퀴즈 생성: gpt-4o-mini 사용 (저렴, 충분한 품질)
- 진단 퀴즈: 개념 수에 비례하지만 라운드당 4문제로 제한

### 기존 학습 엔진과의 관계
- 기존 `strategyTag`, `interactionType`, `confidenceLevel`은 유지
- Concept + Quiz 시스템은 **상위 레이어**로 추가
- Focus Mode에서 서브태스크 진행 중 퀴즈 트리거 가능
