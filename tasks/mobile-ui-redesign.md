# Mobile UI Redesign - Astrology App Inspired

## Current Issues
- UI looks unprofessional on mobile
- Too cluttered with controls
- Not focused on task content

## Design Goals (Based on Reference Images)

### Screen 1: Splash/Home
- Clean starfield background
- Centered app branding
- Minimal UI

### Screen 2: Task Detail View (Main View)
```
┌─────────────────────────────┐
│                    [⚙️]      │ Settings icon (top right)
│                             │
│         Task Name           │ Like "Scorpio"
│      Task Duration          │ Like "Oct 20 - Nov 29"
│                             │
│    [📋] [🎯] [📊] [⏰]      │ Quick action icons (click to zoom/navigate)
│                             │
│  [Today] Tomorrow  Weekly   │ Tabs (underline active)
│                             │
│  AI Breakdown / Subtasks:   │
│  ┌─────────────────────┐   │
│  │ • Subtask 1         │   │
│  │ • Subtask 2         │   │
│  │ • Subtask 3         │   │
│  └─────────────────────┘   │
│                             │
│  Progress bars...           │
│                             │
│                             │
│  [Search/Filter bar]        │ Bottom, responsive width, margins
└─────────────────────────────┘
```

### Screen 3: Constellation View (Weekly Tab)
- Full screen constellation visualization
- Only stars and connection lines
- No zoom controls
- Clean, minimal
- Tap star to zoom to that task

## Implementation Plan

### Phase 1: Create New Mobile Layout Component
- [ ] Create MobileTaskView.tsx (new component)
- [ ] Tab navigation (Today, Tomorrow, Weekly)
- [ ] Task header with name and duration
- [ ] Quick action icon row
- [ ] Settings icon (top right)

### Phase 2: Today Tab (AI Breakdown/Subtasks)
- [ ] Show AI-generated subtasks in list
- [ ] Progress bars for categories (like Career, Love, etc.)
- [ ] Clean card design with dark theme

### Phase 3: Tomorrow Tab (Focus Mode)
- [ ] Show next incomplete subtask
- [ ] Quick start focus mode button
- [ ] Estimated time display

### Phase 4: Weekly Tab (Constellation View)
- [ ] Full screen constellation
- [ ] Remove all UI overlays (zoom, controls)
- [ ] Only show stars and lines
- [ ] Tap star to zoom into that task
- [ ] Smooth transitions

### Phase 5: Bottom Search/Filter
- [ ] Responsive width with side margins
- [ ] Clean design matching theme
- [ ] Floating above background

### Phase 6: Mobile-First Responsive
- [ ] Mobile view uses new design
- [ ] Desktop keeps current design (or adapt later)
- [ ] Breakpoint at 768px

## Key Design Elements

### Colors (Match Astrology App)
- Background: Deep purple/black gradient
- Text: White with opacity variations
- Accent: Purple/blue glow
- Stars: White with glow effect

### Typography
- Task name: Large, bold, centered
- Duration: Small, light, centered
- Subtasks: Medium, clean list
- Progress labels: Small, uppercase

### Spacing
- Top padding: 60px (for status bar)
- Side margins: 16-24px
- Section gaps: 32px
- Clean, breathable layout

## Files to Create
1. `/frontend/components/mobile/MobileTaskView.tsx` - Main mobile layout
2. `/frontend/components/mobile/TaskHeader.tsx` - Task name + duration
3. `/frontend/components/mobile/QuickActions.tsx` - Icon row
4. `/frontend/components/mobile/TodayTab.tsx` - Subtasks view
5. `/frontend/components/mobile/TomorrowTab.tsx` - Focus mode preview
6. `/frontend/components/mobile/WeeklyTab.tsx` - Constellation full view
7. `/frontend/components/mobile/BottomSearch.tsx` - Search/filter bar

## Files to Modify
1. `/frontend/app/page.tsx` - Detect mobile, render MobileTaskView
2. `/frontend/components/TaskGraphView.tsx` - Adapt for mobile
3. `/frontend/styles/globals.css` - Add mobile-specific styles

## Success Criteria
- [ ] Looks like reference images
- [ ] Clean, minimal UI on mobile
- [ ] Easy navigation with tabs
- [ ] Smooth constellation view
- [ ] No clutter, focus on content
- [ ] Professional, polished feel

## Timeline
- Phase 1-2: 3 hours
- Phase 3-4: 3 hours
- Phase 5-6: 2 hours
Total: 8 hours

## Confirmed Approach
- Mobile only redesign (< 768px)
- Desktop keeps current constellation view (with polish)
- Start with Phase 1 and work through systematically

## Implementation Status
- [x] Planning complete
- [x] Phase 1: Layout components
- [x] Phase 2: Today tab
- [x] Phase 3: Tomorrow tab
- [x] Phase 4: Weekly tab
- [x] Phase 5: Bottom search
- [x] Phase 6: Integration with app

## Components Created
1. `/frontend/components/mobile/MobileTaskView.tsx` - Main layout with tabs
2. `/frontend/components/mobile/TaskHeader.tsx` - Task name and duration
3. `/frontend/components/mobile/QuickActions.tsx` - Icon row for task selection
4. `/frontend/components/mobile/TodayTab.tsx` - Subtasks list with progress
5. `/frontend/components/mobile/TomorrowTab.tsx` - Focus mode preview
6. `/frontend/components/mobile/WeeklyTab.tsx` - Constellation visualization
7. `/frontend/components/mobile/BottomSearch.tsx` - Search/filter bar

## Integration
- Modified `/frontend/app/page.tsx` to detect mobile (< 768px)
- Mobile users see new design
- Desktop users see current constellation view
