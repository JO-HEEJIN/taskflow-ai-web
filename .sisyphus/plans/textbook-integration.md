# Prometheus Work Plan: 교재 연동 기능

**생성일**: 2026-01-20
**상태**: 계획 완료
**프로젝트**: TaskFlow AI

---

## 요구사항 요약

**목표**: 사용자가 교재(PDF, 웹 링크, 수동 입력)를 등록하면 AI가 자동으로 학습 계획(Task/Subtask)을 생성하고, 진도 추적 및 복습 스케줄링까지 제공

**핵심 가치**:
- 교재 → 실행 가능한 학습 단위로 자동 분해
- 기존 Focus Mode와 연계하여 학습 세션 진행
- Gamification (XP, 레벨)과 연동하여 학습 동기 부여

---

## Acceptance Criteria

1. **교재 등록**: PDF 업로드 또는 목차 수동 입력으로 교재 등록 가능
2. **AI 분석**: 교재 목차/내용을 분석하여 챕터별 학습 Task 자동 생성
3. **학습 Task 연동**: 생성된 Task는 기존 constellation view에 표시
4. **진도 추적**: 교재별 학습 진행률 시각화
5. **복습 알림**: 완료된 챕터에 대해 SRS(간격 반복) 기반 복습 제안

---

## 구현 계획

### Phase 1: 데이터 모델 & Backend API

#### US-1: Textbook 모델 정의
**파일**: `backend/src/types/index.ts`
- Textbook interface 추가
  - id, title, author, coverImage?
  - chapters: Chapter[]
  - syncCode (userId)
  - createdAt, updatedAt

**파일**: `backend/src/services/textbookService.ts`
- CRUD operations for textbooks

#### US-2: Chapter → Task 변환 로직
**파일**: `backend/src/services/textbookService.ts`
- createTasksFromTextbook(): 교재 챕터를 Task로 변환
- AI 서비스 연동하여 각 챕터의 학습 subtask 생성

**파일**: `backend/src/services/azureOpenAIService.ts`
- generateStudyPlan(): 챕터 제목/내용으로 학습 단계 생성

#### US-3: Textbook API 엔드포인트
**파일**: `backend/src/routes/textbooks.ts`
- POST /api/textbooks - 교재 등록
- GET /api/textbooks - 교재 목록
- GET /api/textbooks/:id - 교재 상세
- POST /api/textbooks/:id/generate-tasks - AI 학습 계획 생성
- DELETE /api/textbooks/:id - 교재 삭제

---

### Phase 2: PDF 파싱 (선택적)

#### US-4: PDF 목차 추출
**파일**: `backend/src/services/pdfService.ts`
- extractTableOfContents(): PDF에서 목차 추출
- 라이브러리: pdf-parse 또는 Azure Document Intelligence

**파일**: `backend/src/routes/textbooks.ts`
- POST /api/textbooks/upload - PDF 업로드 및 파싱

---

### Phase 3: Frontend - 교재 라이브러리

#### US-5: 교재 라이브러리 UI
**파일**: `frontend/components/textbook/TextbookLibrary.tsx`
- 교재 목록 그리드/리스트 뷰
- 교재 추가 버튼
- 각 교재의 진행률 표시

**파일**: `frontend/store/textbookStore.ts`
- textbooks, fetchTextbooks, createTextbook, deleteTextbook

#### US-6: 교재 등록 모달
**파일**: `frontend/components/textbook/AddTextbookModal.tsx`
- 수동 입력: 제목, 저자, 챕터 목록
- PDF 업로드 (Phase 2 완료 시)
- AI가 챕터 분석 후 Task 생성 옵션

#### US-7: 교재 상세 뷰
**파일**: `frontend/components/textbook/TextbookDetail.tsx`
- 챕터별 진행률 표시
- 각 챕터 → 연결된 Task로 이동
- 전체 교재 진행률 시각화 (프로그레스 바)

---

### Phase 4: 기존 시스템 통합

#### US-8: Task에 교재 연결 정보 추가
**파일**: `backend/src/types/index.ts`
- Task interface에 textbookId?, chapterId? 필드 추가

**파일**: `frontend/types/index.ts`
- 동일하게 추가

**파일**: `frontend/components/TaskDetail.tsx`
- 교재 연결 정보 표시 (어떤 교재의 몇 장인지)

#### US-9: Constellation View에 교재 필터
**파일**: `frontend/components/TaskGraphView.tsx`
- 필터 옵션에 "교재별 보기" 추가
- 교재 노드 → 챕터 Task 연결 시각화

---

### Phase 5: 복습 시스템

#### US-10: SRS 복습 스케줄링
**파일**: `backend/src/services/textbookService.ts`
- scheduleReview(): 완료된 챕터에 복습 일정 설정
- getUpcomingReviews(): 오늘 복습할 챕터 목록

**파일**: `frontend/components/ReviewReminder.tsx`
- 복습 알림 배너/모달

#### US-11: 학습 통계 대시보드
**파일**: `frontend/components/textbook/StudyStats.tsx`
- 총 학습 시간, 완료 챕터 수
- 교재별 진행률 차트
- 연속 학습일 (streak 연동)

---

## 파일 구조

```
backend/
├── src/
│   ├── types/index.ts          # Textbook, Chapter 타입 추가
│   ├── services/
│   │   ├── textbookService.ts  # 신규
│   │   └── pdfService.ts       # 신규 (Phase 2)
│   └── routes/
│       └── textbooks.ts        # 신규

frontend/
├── components/
│   └── textbook/
│       ├── TextbookLibrary.tsx # 신규
│       ├── AddTextbookModal.tsx# 신규
│       ├── TextbookDetail.tsx  # 신규
│       ├── StudyStats.tsx      # 신규
│       └── ReviewReminder.tsx  # 신규
├── store/
│   └── textbookStore.ts        # 신규
└── types/index.ts              # Textbook 타입 추가
```

---

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| PDF 파싱 정확도 | Phase 1에서 수동 입력 우선, PDF는 선택적 |
| AI 학습 계획 품질 | 프롬프트 튜닝 + 사용자 편집 기능 제공 |
| 데이터 모델 복잡도 | 기존 Task 모델 확장으로 최소화 |

---

## 우선순위

**MVP (Phase 1 + 3)**: 수동 교재 등록 + AI 학습 계획 생성
- 약 5-7개 파일 수정/생성
- 핵심 가치 검증 가능

**확장 (Phase 2, 4, 5)**: PDF 파싱, 시각화, 복습 시스템
- 사용자 피드백 후 진행

---

## 실행 명령

```
/ralph-loop 교재 연동 기능 MVP 구현 (Phase 1 + 3)
```
