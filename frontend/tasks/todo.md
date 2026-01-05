# Constellation View Redesign - Visual Hierarchy Implementation

## Overview
Transform constellation view to show visual hierarchy: Task (large circles) -> Subtasks (medium circles) -> Atomic tasks (small circles), with connecting lines similar to follow-up task logic.

## Current State
- Tasks appear as large circles
- Subtasks are shown only in modal view
- Atomic tasks are flattened into constellation but without proper visual hierarchy
- Follow-up tasks already have the parent-child connection line logic

## Target State
1. Visual hierarchy in constellation:
   - Task: Large circle (current)
   - Subtasks: Medium circles connected to parent task (3-6 per task)
   - Atomic tasks: Small circles connected to parent subtask

2. Modal behavior changes based on what's clicked:
   - Click Task: Show all subtasks with hierarchical atomic tasks (Git flow style)
   - Click Subtask (no atomics): Show only that subtask
   - Click Subtask (with atomics): Show subtask + its atomics
   - Click Atomic: Show only that atomic

3. Focus mode behavior:
   - From Task modal: Full flow (existing behavior)
   - From Subtask (no atomics): Single subtask only, then exit
   - From Subtask (with atomics): Atomics first, then parent with "You did well" button (timer at 0s)
   - From Atomic: Single atomic only, then exit

## Implementation Plan - UPDATED (Method 2: Desktop/Mobile Split)

**Philosophy:** "Same task, different perspectives" (inspired by Orion's Belt video)
- Desktop: Galaxy View (manager perspective - see all structure)
- Mobile: Solar System View (executor perspective - focus on current task)

### Phase 1: Core Hierarchy Logic
- [ ] Create `components/graph/hierarchyUtils.ts`
  - [ ] Define GraphNode and GraphLink interfaces
  - [ ] Implement `generateHierarchyGraph()` with Orbit Layout
  - [ ] Task (Sun) → Subtasks (Planets) → Atomics (Moons)
  - [ ] Handle positioning math (angles, radii)

### Phase 2: Mobile Solar System View
- [ ] Create `components/mobile/MobileConstellationView.tsx`
  - [ ] Canvas rendering with auto-centering on selected Task
  - [ ] Draw connection lines (Task→Subtask: solid, Subtask→Atomic: dashed)
  - [ ] Draw nodes with size hierarchy (Task: 14px, Subtask: 9px, Atomic: 5px)
  - [ ] Implement rotation animation when switching tasks
  - [ ] Touch hit detection (larger hit area than visual size)

- [ ] Update `components/mobile/WeeklyTab.tsx`
  - [ ] Add NodeContext interface export
  - [ ] Replace current canvas logic with MobileConstellationView
  - [ ] Pass onNodeClick handler with context

### Phase 3: Modal Context Filtering
- [ ] Update `components/TaskDetail.tsx`
  - [ ] Add `initialContext?: NodeContext` prop
  - [ ] Implement `getVisibleSubtasks()` filter logic:
    - [ ] Task click: Show all subtasks
    - [ ] Subtask click (no atomics): Show only that subtask
    - [ ] Subtask click (with atomics): Show subtask + atomics
    - [ ] Atomic click: Show only that atomic
  - [ ] Add context header badge (Filtered View indicator)
  - [ ] Update Focus Mode button text based on context

### Phase 4: Git Flow Hierarchy Display
- [ ] Design hierarchy view in Task modal
  - [ ] Subtask cards with left border
  - [ ] Atomic tasks indented with curve connectors
  - [ ] Visual style matching Git branch/commit flow
  - [ ] Collapsible sections for subtasks with many atomics

### Phase 5: Focus Mode Entry Logic
- [ ] Update `store/useCoachStore.ts`
  - [ ] Add context parameter to enterFocusMode
  - [ ] Filter subtasks based on entry context
  - [ ] Ensure parent subtask included for atomic flows

- [ ] Modify parent confirmation view
  - [ ] Detect when all atomics complete → show parent
  - [ ] Timer at 0 seconds (no countdown)
  - [ ] "You did well" button instead of "I did it"
  - [ ] Exit to main screen on button click

### Phase 6: Integration & Testing
- [ ] Update `components/mobile/MobileTaskView.tsx`
  - [ ] Integrate MobileConstellationView
  - [ ] Handle NodeContext state
  - [ ] Show filtered TaskDetail modal on node click

- [ ] Test all click scenarios:
  - [ ] Task → Full modal → Full focus flow
  - [ ] Subtask (no atomics) → Single card → Quick focus → Exit
  - [ ] Subtask (with atomics) → Filtered modal → Atomic flow → Parent confirmation → Exit
  - [ ] Atomic → Single card → Quick focus → Exit

### Phase 7: Polish & Animations
- [ ] Solar system rotation animation (task switching)
- [ ] Node pulse animation (pending tasks)
- [ ] Connection line glow effect
- [ ] Smooth modal transitions

### Phase 8: Desktop Galaxy View (Future)
- [ ] Create `components/TaskGraphView.tsx`
  - [ ] Reuse hierarchyUtils
  - [ ] Leverage existing zoom/pan (already implemented)
  - [ ] Multi-task grid layout
  - [ ] Render all tasks simultaneously

## Design Notes

### Circle Sizes (Relative)
- Task: 100% (current size)
- Subtask: ~70% of task size
- Atomic: ~50% of task size

### Connection Lines
- Use existing follow-up logic as reference
- Lines should be curved/bezier for clarity
- Color coding: Task->Subtask (one color), Subtask->Atomic (another color)

### Modal Hierarchy Display (Git Flow Style)
```
Task Modal:
- Subtask 1 (11min)
  |- Atomic: Part 1 (3min)
  |- Atomic: Part 2 (4min)
  |- Atomic: Part 3 (4min)
- Subtask 2 (5min)
- Subtask 3 (8min)
```

## Key Files to Modify
- Constellation visualization component (find with Glob)
- Modal component (TaskDetail.tsx or similar)
- Focus mode entry logic (useCoachStore.ts)
- Focus mode view component (GalaxyFocusView or similar)

## Review Section
(To be filled after implementation)

## Questions to Resolve Before Starting
1. Which component renders the constellation view?
2. How are follow-up connection lines currently implemented?
3. Do we need backend changes for tracking "clicked context"?
4. Should we create new components or modify existing ones?
