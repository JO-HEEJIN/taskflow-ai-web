# TaskFlow AI - Product Hunt Launch Preparation

**Current Phase**: Critical Bug Fix + Technical Polish
**Launch Target**: After technical issues resolved
**Status**: Fixing nested title object bug, then UI/UX polish

---

## DEPLOYMENT INFRASTRUCTURE - Dec 30, 2025

### Problem
- Accidentally created duplicate resources in wrong resource group (taskflow-rg)
- Deployment URLs kept changing between resource groups
- No standardized deployment process
- Risk of deploying to wrong environment

### Completed Tasks
- [x] Identified correct resource group: birth2death-imagine-cup-2026
- [x] Fixed frontend Dockerfile backend URL
- [x] Deployed frontend to correct resource group
- [x] Deployed backend with updated CORS settings
- [x] Created deploy-frontend.sh script
- [x] Created deploy-backend.sh script
- [x] Created deploy-all.sh script (complete deployment)
- [x] Created DEPLOYMENT.md documentation
- [x] Made all scripts executable
- [x] Deleted duplicate resource group (taskflow-rg)
- [x] Verified production URLs working
- [x] Commit changes to git

### Production URLs (STABLE)
- Frontend: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
- Backend: https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
- Resource Group: birth2death-imagine-cup-2026
- Environment: taskflow-env
- Region: East US

### Review
Created standardized deployment infrastructure to prevent future URL changes and resource duplication. All deployments now use explicit resource group and environment parameters. Documentation provides clear guidelines for deployment process.

---

## IMMEDIATE PRIORITY - Bug Fix

### Nested Title Object Bug (RESOLVED)
- [x] Added defensive fix in guestStorage.createTask to handle nested objects
- [x] Fixed CORS configuration to allow localhost:3000, 3002, 3003
- [x] Backend restarted with new CORS config
- [ ] Remove debugging console.log statements (pending cleanup)

### Auto-Focus Mode Feature (COMPLETE)
- [x] Add auto-trigger AI breakdown after task creation
- [x] Auto-accept generated subtasks
- [x] Auto-enter focus mode
- [x] Add loading state (uses taskStore.isLoading)
- [x] Handle errors gracefully (toast notifications)

### Mobile UI Redesign (PENDING APPROVAL)
See detailed plan: `/tasks/mobile-ui-redesign.md`
- [ ] Get user approval on design direction
- [ ] Decide: mobile-only or desktop too?
- [ ] Phase 1: Create new mobile layout components
- [ ] Phase 2: Implement Today tab (subtasks)
- [ ] Phase 3: Implement Tomorrow tab (focus mode preview)
- [ ] Phase 4: Implement Weekly tab (constellation view)
- [ ] Phase 5: Bottom search/filter bar
- [ ] Phase 6: Responsive breakpoints and polish

---

## Technical Polish - Product Hunt Readiness

### Phase 1: Design System Foundation (COMPLETED)
- [x] Create design-tokens.css
- [x] Create base UI components (Button, Card, Modal, Icon, Toast)
- [x] Update Tailwind config with design tokens

### Phase 2: Mobile UX Fixes (MOSTLY COMPLETE)
- [x] Fix touch target sizes (minimum 48px)
- [x] Fix overlapping elements
- [x] Fix responsive breakpoints
- [ ] Test on real mobile device (iPhone, Android)

### Phase 3: Onboarding & Empty States
- [x] Create ADHD-friendly empty states (EmptyStateWithActions)
- [x] Replace alert() with Toast notifications
- [ ] Create OnboardingTutorial component (4-step walkthrough)
- [ ] Enhance loading states with animations
- [ ] Improve error messages (friendly, actionable)

### Phase 4: Desktop UX Polish
- [x] Replace emoji icons with Lucide React
- [ ] Implement keyboard shortcuts (Cmd+N, Cmd+K, Cmd+B, ESC, ?)
- [ ] Add max-width containers for desktop
- [ ] Improve hover states consistency
- [ ] Implement focus trap in modals

### Phase 5: Landing Page
- [ ] Create landing page structure (/)
- [ ] Hero section with CTA
- [ ] Features showcase
- [ ] How It Works section
- [ ] Routing setup (/ for landing, /app for main app)

### Phase 6: Final Polish
- [ ] Audit inline styles, move to Tailwind
- [ ] Replace magic numbers with design tokens
- [ ] Performance optimization (reduce star count on mobile)
- [ ] Accessibility audit (WCAG AA, aria-labels, keyboard nav)
- [ ] Mobile + Desktop testing across browsers
- [ ] Clean console (no errors or warnings)

---

## ✅ Completed Development

- ✅ Guest mode with localStorage
- ✅ AI Breakdown for all users (including guests)
- ✅ Data migration on sign-in
- ✅ Kanban board with drag-and-drop
- ✅ Linked tasks and mind map visualization
- ✅ Search and filter
- ✅ Subtask management (create, delete, reorder, archive)
- ✅ Markdown support
- ✅ Notion-style side panel
- ✅ Cosmic glassmorphism theme
- ✅ Backend deployed to Azure Container Apps
- ✅ Frontend deployed to Azure Container Apps

### Recent Fixes (Dec 29, 2025)
- ✅ Profile UI with gamification (level, XP, 30-day activity heatmap)
- ✅ Mobile UI positioning fixes (emergency button, profile button)
- ✅ Encouragement popup centered display
- ✅ Focus Mode timer auto-reset on subtask change
- ✅ Focus Mode skip completed subtasks (smart navigation)
- ✅ Timer/message duration synchronization (AI mentions correct minutes)

**Live URLs:**
- Frontend: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
- Backend: https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io

---

## 📸 Phase 1: Screenshot Capture (Highest Priority)

Reference: `/tasks/screenshot-guide.md`

### 1.1 Prepare Browser Environment
- [ ] Open Chrome in incognito mode (fresh guest session)
- [ ] Set window size to exactly 1920x1080
- [ ] Navigate to production URL
- [ ] Zoom 100%, hide bookmarks bar
- [ ] Enable Do Not Disturb (no notifications)

### 1.2 Capture Screenshots (Need 5-6 images)

**Screenshot 1: Hero/Landing - Guest Mode**
- [ ] Show empty app with guest mode indicator
- [ ] Banner: "Your tasks are saved locally"
- [ ] Cosmic theme background visible
- [ ] Save as: `taskflow-01-hero.png`
- Caption: "Start using instantly—no signup required."

**Screenshot 2: AI Breakdown - Before**
- [ ] Create task: "Build a marketing website"
- [ ] Open task detail panel
- [ ] Show "✨ AI Breakdown" button
- [ ] Cursor hovering over button
- [ ] Save as: `taskflow-02-ai-before.png`
- Caption: "Got an overwhelming task? Click AI Breakdown."

**Screenshot 3: AI Breakdown - During**
- [ ] Click AI Breakdown button
- [ ] Capture loading modal with spinner
- [ ] "Generating subtasks..." visible
- [ ] Save as: `taskflow-03-ai-during.png`
- Caption: "GPT-4 breaks it down into manageable steps."

**Screenshot 4: AI Breakdown - After**
- [ ] Show modal with 8-12 AI-generated subtasks
- [ ] Each subtask with checkbox
- [ ] "Add Selected Subtasks" button visible
- [ ] Save as: `taskflow-04-ai-after.png`
- Caption: "Suddenly, the impossible feels doable."

**Screenshot 5: Kanban Board**
- [ ] Create 3-4 tasks with different statuses
- [ ] Show Pending, In Progress, Completed columns
- [ ] Progress bars visible on cards
- [ ] Save as: `taskflow-05-kanban.png`
- Caption: "Visual progress tracking for ADHD working memory."

**Screenshot 6: Mobile View**
- [ ] Open DevTools, switch to iPhone 12 Pro (390x844)
- [ ] Create task and show detail panel
- [ ] All features accessible on mobile
- [ ] Save as: `taskflow-06-mobile.png`
- Caption: "Capture tasks wherever inspiration strikes."

### 1.3 Post-Process Screenshots
- [ ] Verify all images are high resolution
- [ ] Compress to < 500KB each (use tinypng.com)
- [ ] Crop any browser chrome if needed
- [ ] Ensure text is readable
- [ ] Verify cosmic theme looks vibrant

---

## 🎬 Phase 2: Demo Video Creation

Reference: `/tasks/demo-video-script.md`

### 2.1 Prepare Recording Environment
- [ ] Clear desktop clutter
- [ ] Close unnecessary apps
- [ ] Set up screen recorder (QuickTime/OBS)
- [ ] Test 5-second recording for quality
- [ ] Practice run-through 2-3 times

### 2.2 Record 30-Second Demo Video

**Scene Breakdown:**
- [ ] 0-5s: Show overwhelming task being created
- [ ] 5-10s: Click AI Breakdown button
- [ ] 10-20s: Show AI generating subtasks (scroll through)
- [ ] 20-25s: Show final breakdown with all subtasks
- [ ] 25-30s: CTA with URL overlay

### 2.3 Add Text Overlays
- [ ] 0-5s: "ADHD brain: 'I should build a website' 😰"
- [ ] 5-10s: "TaskFlow AI to the rescue ✨"
- [ ] 10-20s: "Suddenly, it's doable! 🎉"
- [ ] 25-30s: "Start instantly. No signup required. [URL]"

### 2.4 Export Video
- [ ] Format: MP4 (H.264)
- [ ] Resolution: 1920x1080 (1080p)
- [ ] Max file size: 50MB
- [ ] Max duration: 30 seconds
- [ ] Test playback on mobile

### 2.5 Create Social Media Versions
- [ ] Twitter/X: Horizontal 1920x1080 (same as main)
- [ ] Instagram/TikTok: Vertical 1080x1920
- [ ] Instagram: Square 1080x1080

---

## 📝 Phase 3: Product Hunt Submission Preparation

Reference: `/tasks/product-hunt-launch.md`

### 3.1 Product Information

**Tagline (60 chars max):**
- [ ] Draft: "AI task breakdown for ADHD brains. Zero friction."
- [ ] Verify character count (currently 50 chars - ✓)

**Product Description (140 chars max):**
- [ ] Draft: "Breaks overwhelming tasks into bite-sized steps using AI. Start instantly—no signup required. Built specifically for ADHD minds."
- [ ] Verify character count (currently 139 chars - ✓)

**Topics/Categories:**
- [ ] Select: Productivity
- [ ] Select: Artificial Intelligence
- [ ] Select: Task Management
- [ ] Select: Mental Health
- [ ] Select: Neurodiversity

### 3.2 First Comment (Maker's Story)
- [ ] Write backstory about ADHD and friction
- [ ] Explain the "ADHD tax" of signup walls
- [ ] Describe the two core solutions (guest mode + AI)
- [ ] Mention tech stack
- [ ] Ask for specific feedback
- [ ] Ready to paste immediately after launch

### 3.3 Supporting Materials
- [ ] Create app icon (512x512 PNG)
- [ ] Create Open Graph image (1200x630)
- [ ] Create Twitter card image (1200x600)
- [ ] Prepare custom short URL (optional): bit.ly

---

## 🚀 Phase 4: Launch Day Execution

### 4.1 Pre-Launch (24 hours before)
- [ ] All screenshots uploaded and ready
- [ ] Demo video uploaded and tested
- [ ] Product description finalized
- [ ] First comment written and saved
- [ ] Twitter thread drafted
- [ ] Test all features one final time in production
- [ ] Verify guest mode works flawlessly
- [ ] Verify AI breakdown works for guests
- [ ] Set phone alarm for 11:50 PM Pacific (10 min warning)

### 4.2 Launch Moment (00:01 AM Pacific)
- [ ] Submit product to Product Hunt
- [ ] Upload all screenshots in correct order
- [ ] Upload demo video
- [ ] Enter tagline and description
- [ ] Select categories/topics
- [ ] Publish submission
- [ ] Immediately post "First Comment"
- [ ] Tweet launch announcement
- [ ] Set 30-minute reminder to check for comments

### 4.3 Throughout Launch Day
- [ ] Monitor comments every 30-60 minutes
- [ ] Reply to EVERY comment within 1-2 hours
- [ ] Answer questions thoughtfully
- [ ] Thank upvoters
- [ ] Share updates on Twitter
- [ ] Engage with other products (give genuine feedback)
- [ ] Update metrics tracker

### 4.4 End of Day Review
- [ ] Record final upvote count
- [ ] Record comment count
- [ ] Record daily ranking position
- [ ] Record website traffic from PH
- [ ] Record guest task creations
- [ ] Record conversions to authenticated users

---

## 📱 Phase 5: Social Media Marketing

### 5.1 Twitter/X Launch Thread

**Tweet 1:**
- [ ] Announcement with PH link
- [ ] Hook: "For everyone with ADHD who's ever stared at 'build website' and thought '...but HOW?'"

**Tweet 2:**
- [ ] Problem statement: ADHD brains freeze at big tasks

**Tweet 3:**
- [ ] Solution 1: AI breakdown

**Tweet 4:**
- [ ] Demo video embed (15-second version)

**Tweet 5:**
- [ ] Tech stack and call for feedback

### 5.2 Other Platforms

**Hacker News:**
- [ ] Post as "Show HN: TaskFlow AI - AI task breakdown for ADHD minds"
- [ ] Include guest mode as key differentiator

**Dev.to:**
- [ ] Write blog post: "Building TaskFlow AI: Removing friction for ADHD brains"
- [ ] Include development story and tech decisions

**Indie Hackers:**
- [ ] Post launch announcement
- [ ] Share metrics and learnings
- [ ] Ask for feedback on pricing model

**ADHD Discord Servers:**
- [ ] Share with context (not spam)
- [ ] Genuinely ask for feedback
- [ ] Offer to help other ADHD folks

### 5.3 TikTok/Reels/Shorts (Optional - High Potential)

**10-Second Ultra-Short Version:**
- [ ] 0-2s: Show overwhelming task
- [ ] 2-3s: Click AI Breakdown
- [ ] 3-7s: Subtasks appear rapidly (sped up 2x)
- [ ] 7-8s: Check first subtask
- [ ] 8-10s: CTA with URL

**Vertical format (1080x1920):**
- [ ] Record screen in portrait mode
- [ ] Add trendy music (royalty-free)
- [ ] Text overlays optimized for vertical

**Hashtags:**
- #ADHD #Productivity #AI #TaskManagement #GettingThingsDone

---

## 📊 Success Metrics to Track

### Product Hunt Metrics
- [ ] Upvotes (Target: 100+ for good visibility)
- [ ] Comments (Target: 20+ for engagement)
- [ ] Daily ranking position (Target: Top 10)
- [ ] Newsletter feature (if achieved)

### Website Metrics
- [ ] Unique visitors from PH (Track via URL params)
- [ ] Guest mode task creations
- [ ] AI Breakdown usage rate
- [ ] Guest → authenticated conversion rate
- [ ] Average session duration
- [ ] Bounce rate

### Engagement Metrics
- [ ] Twitter impressions
- [ ] Twitter engagement rate
- [ ] Reddit upvotes (if posted)
- [ ] Discord feedback
- [ ] Email signups (if added)

---

## 💬 Pre-Written Responses to Common Questions

**Q: "Is this free?"**
A: "Yes! Guest mode is completely free with full AI features. Sign in with Google to sync across devices (also free, powered by Azure credits)."

**Q: "How does guest mode work?"**
A: "Your tasks save in your browser's localStorage. No backend needed until you want to sync across devices. When you sign in, everything migrates automatically."

**Q: "What AI model do you use?"**
A: "GPT-4 via Azure OpenAI. It's specifically prompted to break down tasks into ADHD-friendly bite-sized steps."

**Q: "Why build another todo app?"**
A: "Most todo apps aren't built for ADHD brains. We need: (1) zero friction to start, (2) help breaking down tasks, (3) visual progress tracking. TaskFlow does all three."

**Q: "Will there be a mobile app?"**
A: "It's fully responsive now (works great on mobile browsers). Native app is planned after validating product-market fit!"

**Q: "How do you make money?"**
A: "Currently running on Azure credits. Future plan: freemium model with premium features (templates, advanced AI, team collaboration) while keeping core features free."

**Q: "Is my data secure?"**
A: "Guest data stays in your browser. Authenticated data is stored in Azure Cosmos DB with encryption at rest. No data is sold or shared."

---

## 🎯 Current Status

**Development:** ✅ Complete
**Production Deployment:** ✅ Live
**Guest Mode:** ✅ Working
**AI Breakdown:** ✅ Available to all users

**Marketing Status:**
- Reddit posts: ❌ Low engagement (300+ views, 0 comments)
- Product Hunt: 🟡 In preparation (this checklist)
- Twitter: ⏳ Pending
- Other platforms: ⏳ Pending

**Next Immediate Action:**
📸 Capture screenshots following the guide in `/tasks/screenshot-guide.md`

---

## 🚧 Blockers/Decisions Needed

- [ ] Choose launch date (next Tuesday or Wednesday?)
- [ ] Decide on Hunter (self-launch vs find a hunter)
- [ ] Create Product Hunt account (if don't have one)
- [ ] Optional: Set up custom short URL (taskflow.ai domain if available)

---

## 📅 Suggested Timeline

**Today (Dec 27):**
- Capture all screenshots
- Record demo video
- Write first comment

**Tomorrow (Dec 28):**
- Edit and polish video
- Create social media versions
- Draft Twitter thread
- Test everything in production

**Dec 29-30:**
- Create additional visual assets (icons, OG images)
- Practice responses to common questions
- Prepare analytics tracking

**Launch Day (Tuesday, Dec 31 or Jan 7):**
- Submit at 00:01 AM Pacific
- Monitor and engage all day
- Cross-post to other platforms

**Post-Launch (Days 2-7):**
- Follow up with engaged users
- Implement quick wins from feedback
- Share results and learnings
- Plan next marketing push

---

## 💡 Key Insights from Reddit Attempt

**What didn't work:**
- Long posts (too much text, people didn't read)
- Reddit had low engagement despite 300+ views

**What to try differently:**
- Product Hunt: Visual-first (screenshots, demo video)
- Twitter: Short, punchy thread with demo GIF
- TikTok/Reels: Ultra-short vertical video (10-15s)
- Focus on showing, not telling

**Core message to emphasize:**
1. Zero friction (no signup wall) = Critical for ADHD
2. AI does the hard part (breaking down tasks)
3. Try it NOW (live demo link)

---

Ready to capture screenshots and create the demo video! 🚀
