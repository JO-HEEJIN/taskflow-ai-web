# Screenshot Capture Guide - Step by Step

## 🎨 Preparation

**Tools Needed:**
- Browser: Chrome (for consistent rendering)
- Window size: 1920x1080 for desktop shots
- Window size: 375x812 for mobile shots (use DevTools)
- Screenshot tool: macOS Screenshot (Cmd+Shift+4) or browser screenshot extension
- Image editor: Preview/Photoshop for any needed cropping

**Before starting:**
1. Clear browser cache and localStorage
2. Open: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
3. Set browser window to exactly 1920x1080
4. Zoom: 100%

---

## Screenshot 1: Hero/Landing - Guest Mode ✨

### Setup:
1. Open app in incognito/private window (fresh guest mode)
2. Wait for page to fully load
3. Don't create any tasks yet (show empty state)

### What should be visible:
- ✅ Top-right corner: Guest mode indicator (G icon + "Guest Mode" + "Sign In" button)
- ✅ Banner below header: "📱 Your tasks are saved locally. Sign in to sync across devices"
- ✅ Cosmic theme background (purple/blue gradient with stars)
- ✅ Main content: Empty kanban board with three columns (Pending, In Progress, Completed)
- ✅ Bottom-right: "Quick Add" floating button visible

### Capture:
- Press Cmd+Shift+4 (macOS) or use screenshot extension
- Capture full browser window (not just viewport)
- Save as: `01-hero-guest-mode.png`

### Caption for Product Hunt:
"Start using instantly—no signup required. Perfect for ADHD brains that hate friction."

---

## Screenshot 2: AI Breakdown - Before 🎯

### Setup:
1. Continue in same session from Screenshot 1
2. Click "Quick Add" button
3. Create a task:
   - Title: "Build a marketing website"
   - Description: "Create a professional site for my consulting business"
4. Click the task card to open detail panel

### What should be visible:
- ✅ Left side: Kanban board with one task card in "Pending" column
- ✅ Right side: Task detail panel open showing:
  - Title: "Build a marketing website"
  - Description: "Create a professional site for my consulting business"
  - Status: Pending
  - Progress: 0%
  - 0 subtasks
  - "✨ AI Breakdown" button prominently visible at bottom
  - Cursor hovering over AI Breakdown button

### Capture:
- Hover cursor over "✨ AI Breakdown" button
- Take screenshot
- Save as: `02-ai-before.png`

### Caption for Product Hunt:
"Got an overwhelming task? Click AI Breakdown and watch the magic happen."

---

## Screenshot 3: AI Breakdown - During ⚡

### Setup:
1. Click the "✨ AI Breakdown" button
2. Wait for modal to appear
3. Screenshot during the loading state (before results)

### What should be visible:
- ✅ Modal overlay covering the screen
- ✅ Modal title: "AI Task Breakdown"
- ✅ Subtitle: "Let AI break this down into manageable steps"
- ✅ Loading animation/spinner
- ✅ Text: "Analyzing task..." or "Generating subtasks..."
- ✅ Blurred background showing the task detail panel

### Timing:
- Take screenshot 1-2 seconds after clicking (during loading)
- If it loads too fast, may need to simulate slower connection

### Capture:
- Screenshot immediately when loading state appears
- Save as: `03-ai-during.png`

### Caption for Product Hunt:
"GPT-4 analyzes your task and breaks it down into manageable steps in seconds."

---

## Screenshot 4: AI Breakdown - After ✅

### Setup:
1. Wait for AI to finish generating subtasks
2. Don't close the modal yet
3. Scroll to show as many suggested subtasks as possible

### What should be visible:
- ✅ Modal showing AI-generated subtasks (should be 8-12 items):
  - "Choose domain name and hosting provider"
  - "Set up development environment (Node.js, framework)"
  - "Design homepage wireframe and layout"
  - "Create responsive navigation menu"
  - "Build main content sections (hero, services, about)"
  - "Add contact form with email integration"
  - "Optimize for mobile devices"
  - "Test across different browsers"
  - (and more...)
- ✅ Each subtask with a checkbox
- ✅ "Add Selected Subtasks" button at bottom
- ✅ "Select All" / "Deselect All" buttons visible

### Capture:
- Scroll to show maximum subtasks in one view
- Save as: `04-ai-after.png`

### Caption for Product Hunt:
"Suddenly, the impossible feels doable. Each step is small enough to actually start."

---

## Screenshot 5: Task with Subtasks Added 🎯

### Setup:
1. Click "Add Selected Subtasks" (add all suggested subtasks)
2. Modal closes, returning to task detail view
3. Task now shows all subtasks in checklist

### What should be visible:
- ✅ Task detail panel showing:
  - Title: "Build a marketing website"
  - Progress bar: 0% (0/8 or 0/10 completed)
  - Full list of subtasks with checkboxes (unchecked)
  - Each subtask clearly readable
  - Option to archive subtasks (three-dot menu)
  - "✨ Add More with AI" button (since subtasks exist now)
- ✅ Left side: Task card updated with progress indicator

### Capture:
- Scroll task detail to show all subtasks
- Save as: `05-task-with-subtasks.png`

### Caption for Product Hunt:
"From overwhelming to organized in seconds. Each checkbox is a small win."

---

## Screenshot 6: Kanban Board in Action 📋

### Setup:
1. Create 3-4 more tasks with different statuses:
   - "Learn React" → In Progress (with 2/5 subtasks done)
   - "Write blog post" → Pending (with 0/4 subtasks done)
   - "Fix website bug" → Completed (with 3/3 subtasks done)
2. Drag tasks to different columns
3. Make sure progress bars show different percentages

### What should be visible:
- ✅ Three columns: Pending, In Progress, Completed
- ✅ Multiple task cards distributed across columns:
  - Pending: 2 tasks
  - In Progress: 1 task (with partial progress)
  - Completed: 1 task (100% progress, different visual style)
- ✅ Each card showing:
  - Title
  - Progress bar with percentage
  - Subtask count (e.g., "3/5 subtasks")
  - Status color indicator
- ✅ Drag handles visible on cards
- ✅ Cosmic theme background
- ✅ Quick Add button in corner

### Capture:
- Close task detail panel to show full kanban board
- Save as: `06-kanban-board.png`

### Caption for Product Hunt:
"Kanban board with drag-and-drop. Visual progress tracking designed for ADHD working memory."

---

## Screenshot 7: Mobile Responsive View 📱

### Setup:
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Click "Toggle device toolbar" (Cmd+Shift+M)
3. Select device: iPhone 12 Pro (390x844) or custom 375x812
4. Refresh page to load mobile styles
5. Create a task and open detail panel

### What should be visible:
- ✅ Mobile viewport (narrow, vertical)
- ✅ Guest mode indicator adapted for mobile
- ✅ Hamburger menu or mobile navigation
- ✅ Task list in mobile layout (stacked vertically)
- ✅ Task detail panel in mobile view:
  - Full-width
  - Touch-friendly buttons
  - Readable text size
  - Subtasks with large tap targets
  - AI Breakdown button accessible
- ✅ Cosmic theme working on small screen
- ✅ Bottom navigation or floating buttons

### Capture:
- Screenshot from DevTools device view
- Save as: `07-mobile-view.png`

### Caption for Product Hunt:
"Fully responsive. Capture tasks the moment ADHD inspiration strikes—wherever you are."

---

## Screenshot 8 (BONUS): Dark Mode / Markdown Editor 📝

### Setup (Option A - Markdown):
1. Create a new task
2. Add detailed description using markdown:
   ```
   ## Project Goals
   - Build MVP by end of month
   - Focus on **core features** first
   - Get 10 beta testers

   ### Tech Stack
   - Next.js
   - TypeScript
   - Azure
   ```
3. View task detail showing rendered markdown

### What should be visible:
- ✅ Task description with rich markdown formatting:
  - Headers (##, ###)
  - Bold text
  - Bullet lists
  - Code blocks
- ✅ Clean typography
- ✅ Syntax highlighting (if applicable)

### Capture:
- Save as: `08-markdown-editor.png`

### Caption for Product Hunt:
"Markdown support for detailed planning. Write notes the way developers think."

---

## Post-Processing Checklist

After capturing all screenshots:

- [ ] Check each image is at least 1920x1080 (or 375x812 for mobile)
- [ ] Crop any browser chrome (address bar) if needed
- [ ] Verify all text is readable
- [ ] Ensure cosmic theme looks vibrant (not washed out)
- [ ] Remove any personal information if accidentally captured
- [ ] Compress images (aim for < 500KB each while maintaining quality)
  - Use: https://tinypng.com or ImageOptim
- [ ] Rename files for Product Hunt upload:
  - `taskflow-01-hero.png`
  - `taskflow-02-ai-before.png`
  - `taskflow-03-ai-during.png`
  - `taskflow-04-ai-after.png`
  - `taskflow-05-subtasks.png`
  - `taskflow-06-kanban.png`
  - `taskflow-07-mobile.png`

---

## Upload Order for Product Hunt

1. **Hero/Landing** (Screenshot 1) - First impression
2. **AI Before** (Screenshot 2) - Show the problem
3. **AI During** (Screenshot 3) - Build anticipation
4. **AI After** (Screenshot 4) - Deliver the solution
5. **Kanban Board** (Screenshot 6) - Show broader functionality
6. **Mobile** (Screenshot 7) - Show responsiveness

**Optional:** Add Screenshot 5 (subtasks added) or Screenshot 8 (markdown) if you have room for more than 6 images.

---

## Quality Checklist

Before finalizing:

- [ ] All screenshots show actual working features (not mockups)
- [ ] UI looks polished and bug-free
- [ ] Text is crisp and readable
- [ ] Colors are vibrant and match brand
- [ ] No console errors visible
- [ ] No lorem ipsum or placeholder text
- [ ] Cosmic theme looks professional
- [ ] Guest mode indicator clearly visible in relevant shots
- [ ] AI features prominently showcased

---

Ready to capture! 📸
