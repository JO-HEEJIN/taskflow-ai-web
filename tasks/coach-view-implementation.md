# Coach View Implementation Plan

## Goal
Build a chat-based AI coaching interface that appears during Focus Mode, allowing users to get help, motivation, and guidance while working on tasks.

## Design Concept

### UI Layout
- Floating chat button (bottom-right, near Emergency button)
- Slides open to reveal chat panel (mobile: full-screen, desktop: side panel)
- Chat history with AI coach messages
- Input field for user messages
- Cosmic glassmorphism theme matching existing UI

### User Flow
1. User is in Focus Mode working on a subtask
2. Clicks chat button to open CoachView
3. Can ask questions like "I'm stuck, what should I do?" or "I need motivation"
4. AI responds with context-aware coaching (knows current task/subtask)
5. Chat history persists during focus session
6. Closes when user exits Focus Mode

## Implementation Checklist

### Backend Changes
- [ ] Add POST /api/ai/coach endpoint
- [ ] Create chatWithCoach method in azureOpenAIService.ts
- [ ] System prompt for AI coach personality
- [ ] Include task context in coaching responses

### Frontend Store Updates
- [ ] Review useCoachStore.messages implementation
- [ ] Add sendMessage action
- [ ] Add clearMessages action (on focus mode exit)

### Frontend Components
- [ ] Create CoachView.tsx component
- [ ] Create ChatMessage.tsx component (individual message bubble)
- [ ] Create ChatInput.tsx component (input field with send button)
- [ ] Add chat toggle button to GalaxyFocusView

### Integration
- [ ] Add CoachView to page.tsx
- [ ] Connect to useCoachStore
- [ ] Wire up API calls
- [ ] Test on mobile and desktop

### Polish
- [ ] Smooth slide-in/out animations
- [ ] Auto-scroll to newest message
- [ ] Loading indicator while AI responds
- [ ] Error handling for failed messages
- [ ] Empty state (welcome message)

## Technical Details

### Backend Endpoint
```
POST /api/ai/coach
Body: {
  message: string,
  taskTitle: string,
  subtaskTitle: string,
  conversationHistory: Array<{role: 'user' | 'ai', content: string}>
}
Response: {
  message: string
}
```

### AI Coach System Prompt
- Role: ADHD coach, encouraging, action-oriented
- Context: Current task and subtask
- Style: Brief (2-3 sentences), concrete advice
- Tone: Warm, supportive, no fluff

### Component Props
```typescript
interface CoachViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task;
  currentSubtask: Subtask;
}
```

### Store Messages Format
```typescript
{
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}
```

## Files to Create
1. /backend/src/routes/ai.ts - Add coach endpoint
2. /frontend/components/focus/CoachView.tsx
3. /frontend/components/focus/ChatMessage.tsx
4. /frontend/components/focus/ChatInput.tsx

## Files to Modify
1. /backend/src/services/azureOpenAIService.ts - Add chatWithCoach method
2. /frontend/store/useCoachStore.ts - Add message actions
3. /frontend/components/focus/GalaxyFocusView.tsx - Add chat button
4. /frontend/lib/api.ts - Add chatWithCoach API call
5. /frontend/app/page.tsx - Render CoachView

## Design Specs

### Colors
- Chat bubbles: User (purple gradient), AI (blue gradient)
- Background: Same cosmic gradient as GalaxyFocusView
- Input field: Glass with purple border glow

### Animations
- Panel slide: 300ms ease-out
- Message appear: fade up (opacity 0->1, y: 20->0)
- Typing indicator: 3 dots pulsing

### Mobile Considerations
- Full-screen overlay on mobile
- Fixed input at bottom
- Chat history scrollable
- Close button top-right

### Accessibility
- Keyboard navigation (Enter to send)
- Focus management (auto-focus input when opened)
- Screen reader friendly message announcements

## Implementation Strategy
1. Start with backend (endpoint + service method)
2. Build basic CoachView UI (no AI yet, just UI)
3. Connect store and API
4. Test and polish
5. Mobile optimization

## Expected Time
- Backend: 30 minutes
- Frontend components: 1-2 hours
- Integration + testing: 30 minutes
- Polish: 30 minutes
Total: ~3 hours

## Success Criteria
- Chat opens/closes smoothly
- AI responds with context-aware coaching
- Messages persist during focus session
- Clear on focus mode exit
- Works perfectly on mobile
- Matches cosmic theme aesthetic
