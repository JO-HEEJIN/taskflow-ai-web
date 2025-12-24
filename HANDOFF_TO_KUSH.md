# Handoff to Kush - Azure Integration & Testing

**Project**: TaskFlow AI - AI-Powered Task Management Web App
**Competition**: Microsoft Imagine Cup 2026
**GitHub**: https://github.com/JO-HEEJIN/taskflow-ai-web
**Date**: December 24, 2024
**Current Phase**: Ready for Azure Integration (Phase 4)

---

## 📋 Current Status

### ✅ Completed (By Momo)

**Phase 1-3 are fully implemented and working:**

1. **Backend (Express + TypeScript)**
   - Complete REST API with 10 endpoints
   - Task CRUD operations
   - AI breakdown endpoint (mock mode)
   - Device sync service
   - Running on: `http://localhost:3001`

2. **Frontend (Next.js 14 + TypeScript + Tailwind CSS)**
   - Full task management UI
   - AI breakdown modal
   - Progress visualization
   - Responsive design (mobile + desktop)
   - Running on: `http://localhost:3000`

3. **Current Mode**: Mock/Development
   - All features work WITHOUT Azure credentials
   - Uses in-memory storage (no database)
   - AI generates mock subtasks
   - Perfect for local development

### 🎯 Your Mission

**Configure Azure services and test with REAL data:**
1. Azure OpenAI Service (GPT-4o)
2. Azure Cosmos DB (NoSQL database)
3. Azure AI Language (text analytics)
4. Test end-to-end functionality
5. Deploy to production

---

## 🚀 Getting Started

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/JO-HEEJIN/taskflow-ai-web.git
cd taskflow-ai-web

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Test in Mock Mode (Optional)

**Before Azure setup, verify everything works locally:**

```bash
# Terminal 1: Start backend
cd backend
npm run dev
# Should see: "🚀 TaskFlow AI Backend running on http://localhost:3001"
# Should see: "🗄️ Cosmos DB: Mock mode"

# Terminal 2: Start frontend
cd frontend
npm run dev
# Should see: "Ready in X.Xs"

# Terminal 3: Test the API
curl http://localhost:3001/health
# Should return: {"status":"ok","cosmosConnected":false}
```

**Open browser**: http://localhost:3000
- Create a task
- Click "AI Breakdown" → Should generate 5 mock subtasks
- Toggle subtasks to see progress update

---

## ☁️ Azure Configuration

### Step 1: Azure OpenAI Service

**Purpose**: Generate intelligent task breakdowns using GPT-4o

1. **Create Azure OpenAI Resource**
   - Go to: https://portal.azure.com
   - Search: "Azure OpenAI"
   - Click: "Create"
   - Resource group: Create new `taskflow-rg`
   - Region: `East US` or `West Europe`
   - Pricing tier: `Standard S0`

2. **Deploy GPT-4o Model**
   - Go to your OpenAI resource → "Model deployments"
   - Click "Create new deployment"
   - Model: `gpt-4o`
   - Deployment name: `gpt-4o` (use this exact name)
   - Click "Create"

3. **Get Credentials**
   - Go to: "Keys and Endpoint"
   - Copy: `KEY 1` and `Endpoint`

4. **Update Backend .env**
   ```bash
   cd backend
   cp .env.example .env
   nano .env  # or use your editor
   ```

   Add these values:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   ```

5. **Test AI Breakdown**
   ```bash
   # Restart backend
   npm run dev
   # Should see: "✅ Azure OpenAI Service initialized" (not mock warning)

   # Test AI endpoint
   curl -X POST http://localhost:3001/api/ai/breakdown \
     -H "Content-Type: application/json" \
     -d '{"title":"Build a mobile app","description":"Create a task management app for iOS"}'

   # Should return REAL AI-generated subtasks (not generic mock ones)
   ```

---

### Step 2: Azure Cosmos DB

**Purpose**: Persistent NoSQL database for tasks and sync sessions

1. **Create Cosmos DB Account**
   - Portal: https://portal.azure.com
   - Search: "Azure Cosmos DB"
   - Click: "Create Azure Cosmos DB account"
   - API: **NoSQL** (important!)
   - Resource group: `taskflow-rg` (same as OpenAI)
   - Account name: `taskflow-db` (must be globally unique)
   - Location: Same as OpenAI resource
   - Capacity mode: **Serverless** (cost-effective for MVP)
   - Click "Review + create"

2. **Wait for Deployment** (takes 5-10 minutes)

3. **Get Connection Details**
   - Go to your Cosmos DB account
   - Left menu: "Keys"
   - Copy: `URI` and `PRIMARY KEY`

4. **Update Backend .env**
   ```env
   COSMOS_ENDPOINT=https://taskflow-db.documents.azure.com:443/
   COSMOS_KEY=your-primary-key-here
   COSMOS_DATABASE_NAME=taskflow-ai
   ```

5. **Test Database Connection**
   ```bash
   # Restart backend
   npm run dev
   # Should see: "✅ Cosmos DB initialized successfully"
   # Should see: "🗄️ Cosmos DB: Connected" (not Mock mode)

   # Create a task via API
   curl -X POST http://localhost:3001/api/tasks \
     -H "Content-Type: application/json" \
     -H "x-sync-code: TEST123" \
     -d '{"title":"Test Task","description":"Testing Cosmos DB"}'

   # Get tasks
   curl http://localhost:3001/api/tasks \
     -H "x-sync-code: TEST123"
   # Should return the task you just created
   ```

6. **Verify in Azure Portal**
   - Go to Cosmos DB → Data Explorer
   - Should see database: `taskflow-ai`
   - Should see containers: `tasks`, `sync-sessions`
   - Click `tasks` → Items → Should see your test task

---

### Step 3: Azure AI Language (Optional for MVP)

**Purpose**: Text analytics for task categorization and sentiment analysis

**Note**: This is nice-to-have for MVP. Focus on OpenAI and Cosmos DB first.

1. **Create Language Resource**
   - Portal: https://portal.azure.com
   - Search: "Language Service"
   - Click: "Create"
   - Resource group: `taskflow-rg`
   - Region: Same as other resources
   - Pricing tier: `Free F0` (5K transactions/month)

2. **Get Credentials**
   - Go to: "Keys and Endpoint"
   - Copy: `KEY 1` and `Endpoint`

3. **Update Backend .env**
   ```env
   AZURE_LANGUAGE_ENDPOINT=https://your-language-resource.cognitiveservices.azure.com/
   AZURE_LANGUAGE_API_KEY=your-language-key-here
   ```

**Implementation**: This service is not yet used in code. You can add it later for:
- Automatic task categorization (work, personal, urgent, etc.)
- Priority detection from task descriptions
- Sentiment analysis for user feedback

---

## 🧪 End-to-End Testing

### Test Scenario 1: Create Task with AI Breakdown

1. **Open app**: http://localhost:3000
2. **Click**: "+ New Task"
3. **Enter**:
   - Title: "Plan a team offsite in Seoul"
   - Description: "Organize a 2-day team building event for 15 people"
4. **Click**: "Create Task"
5. **Click on the task card** to open detail view
6. **Click**: "✨ AI Breakdown"
7. **Click**: "✨ Generate AI Breakdown"
8. **Verify**: Should see 5-7 RELEVANT subtasks like:
   - "Research venue options in Seoul for 15 people"
   - "Create budget breakdown for accommodation and activities"
   - etc. (NOT generic mock subtasks)
9. **Edit** subtasks if needed
10. **Click**: "Accept (X subtasks)"
11. **Verify**: Subtasks appear in task detail
12. **Toggle** subtasks to mark complete
13. **Verify**: Progress bar updates in real-time

### Test Scenario 2: Device Sync

1. **Device A (Chrome browser)**:
   - Open: http://localhost:3000
   - Create a task: "Buy groceries"
   - Open browser DevTools → Console
   - Type: `localStorage.getItem('syncCode')`
   - Copy the sync code (e.g., "EHVGJBG3")

2. **Device B (Firefox/Incognito)**:
   - Open: http://localhost:3000 (will be empty)
   - Open DevTools → Console
   - Type: `localStorage.setItem('syncCode', 'EHVGJBG3')` (use code from Device A)
   - Refresh page
   - **Verify**: "Buy groceries" task appears!

3. **Test Sync**:
   - Device B: Toggle subtask
   - Device A: Refresh → Should see update
   - (Real-time sync requires WebSocket, not implemented yet)

### Test Scenario 3: Data Persistence

1. **Create tasks** in the app
2. **Stop backend server**: Ctrl+C
3. **Restart backend**: `npm run dev`
4. **Refresh frontend**
5. **Verify**: All tasks still there (stored in Cosmos DB)

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch tasks"

**Cause**: Backend not running or CORS issue

**Solution**:
```bash
# Check backend is running
curl http://localhost:3001/health

# Check CORS in backend/.env
CORS_ORIGIN=http://localhost:3000
```

### Issue: "Cosmos DB credentials not configured"

**Cause**: .env file not loaded or wrong values

**Solution**:
```bash
# Verify .env exists
ls backend/.env

# Check values are not empty
cat backend/.env | grep COSMOS

# Restart backend after .env changes
```

### Issue: AI breakdown returns mock data

**Cause**: Azure OpenAI not configured properly

**Solution**:
```bash
# Check logs when starting backend
# Should see: "✅ Azure OpenAI Service initialized"
# Should NOT see: "⚠️ Azure OpenAI credentials not configured"

# Test directly
curl https://your-openai-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Issue: Tasks not persisting after server restart

**Cause**: Still in mock mode (Cosmos DB not connected)

**Solution**:
- Check backend logs for "🗄️ Cosmos DB: Connected"
- Verify COSMOS_ENDPOINT and COSMOS_KEY in .env
- Check Azure portal that Cosmos DB is running

---

## 📊 Verification Checklist

After Azure setup, verify all these work:

- [ ] Backend starts with "✅ Cosmos DB initialized successfully"
- [ ] Backend shows "✅ Azure OpenAI Service initialized"
- [ ] Frontend loads without errors
- [ ] Can create tasks
- [ ] Tasks persist after backend restart
- [ ] AI breakdown generates REAL (not mock) subtasks
- [ ] Subtasks can be toggled
- [ ] Progress updates correctly
- [ ] Sync code can be copied and used on "another device"
- [ ] Data visible in Azure Cosmos DB Data Explorer

---

## 📝 Next Steps After Azure Integration

### Phase 4: Testing & Polish (Dec 25-26)

1. **Performance Testing**
   - Run Lighthouse audit: Target score ≥ 90
   - Test on slow 3G network
   - Optimize if needed

2. **Cross-Browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Mobile Safari (iOS)
   - Mobile Chrome (Android)

3. **Bug Fixes**
   - Fix any issues found in testing
   - Handle edge cases (empty descriptions, very long titles, etc.)

4. **Add Features** (if time permits):
   - Settings page for sync management
   - Task editing (currently can only create/delete)
   - Due dates and reminders
   - Task categories/tags

### Phase 5: Deployment (Dec 27-31)

1. **Backend Deployment**
   - Deploy to Azure App Service
   - Configure environment variables
   - Test production API

2. **Frontend Deployment**
   - Deploy to Vercel (recommended) or Azure Static Web Apps
   - Update API URL to production backend
   - Test production app

3. **End-to-End Production Testing**
   - Test all features on production
   - Test from multiple devices
   - Get user feedback

### Phase 6: Imagine Cup Submission (Jan 1-9)

1. **Create Demo Video** (3-5 minutes)
   - Show problem statement
   - Demo all features
   - Highlight AI capabilities
   - Mention Microsoft Azure services used

2. **Prepare Pitch Deck**
   - Problem & Solution
   - Target users
   - Technical architecture
   - Business model (optional)
   - Team & timeline

3. **Write Documentation**
   - User guide
   - Technical documentation
   - Setup instructions

4. **Submit to Imagine Cup**
   - Deadline: January 9, 2026
   - Required: 2+ Microsoft AI services ✅
     - Azure OpenAI Service ✅
     - Azure AI Language ✅

---

## 💰 Cost Estimate

Based on MVP usage (testing + initial users):

| Service | Tier | Est. Cost/Month |
|---------|------|-----------------|
| Azure OpenAI Service | Pay-as-you-go | $10-30 (depends on usage) |
| Azure Cosmos DB | Serverless | $5-25 (very light usage) |
| Azure AI Language | Free F0 | $0 (5K free transactions) |
| **Total** | | **$15-55/month** |

**Note**: Imagine Cup provides **$1,000-$5,000 in Azure credits** for participants!

---

## 📞 Need Help?

**Resources**:
- Azure OpenAI Docs: https://learn.microsoft.com/en-us/azure/ai-services/openai/
- Cosmos DB Quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/
- Imagine Cup: https://imaginecup.microsoft.com/

**Questions?**
- Check `/tasks/todo.md` for detailed implementation notes
- Review code comments in `/backend/src/services/`
- Contact Momo for clarification

---

## 🎯 Success Criteria

You're done when:

✅ Backend logs show Cosmos DB connected
✅ Backend logs show Azure OpenAI initialized
✅ AI breakdown generates relevant, specific subtasks
✅ Tasks persist after server restart
✅ Can sync between two browser windows
✅ All data visible in Azure portal

**Good luck, Kush! You've got this! 🚀**

---

*Last updated: December 24, 2024*
*Created by: Momo*
*Next owner: Kush*
