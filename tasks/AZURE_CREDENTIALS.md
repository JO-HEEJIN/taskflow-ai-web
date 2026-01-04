# Azure OpenAI Credentials & Configuration
**Last Updated:** 2026-01-05
**Status:** Partially configured (gpt-4o-mini ready, waiting for o3-mini)

---

## Current Configuration

### Endpoint Information
```
Endpoint: https://birth2death-openai.openai.azure.com/
API Version: 2025-01-01-preview
API Key: ***REDACTED*** (stored in .env)
```

### Deployed Models

#### ✅ gpt-4o-mini (Coach Tier)
- **Deployment Name:** `gpt-4o-mini`
- **Model:** gpt-4o-mini
- **Full Endpoint:** https://birth2death-openai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2025-01-01-preview
- **Status:** Active and configured
- **Usage:** Tier 2 Coach (encouragement, quick tips)

#### ✅ o3-mini (Architect + Deep Dive Tiers)
- **Deployment Name:** `o3-mini`
- **Model:** o3-mini
- **Full Endpoint:** https://birth2death-openai.openai.azure.com/openai/deployments/o3-mini/chat/completions?api-version=2025-01-01-preview
- **Status:** Active and configured
- **Usage:**
  - Tier 1 Architect (initial task breakdown)
  - Tier 3 Deep Dive (recursive breakdown for 10+ min tasks)

#### ⏳ gpt-4o (Fallback Tier)
- **Deployment Name:** TBD (optional)
- **Model:** gpt-4o
- **Status:** Not yet deployed
- **Usage:** Fallback when o3-mini unavailable

---

## Environment Variables Configuration

### Backend (.env)
```bash
# Azure OpenAI Service
AZURE_OPENAI_ENDPOINT=https://birth2death-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Legacy deployment name (deprecated, use Triple-Tier below)
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

# Triple-Tier AI Architecture (Quality-First Strategy)
# Tier 1: Architect - Initial task breakdown (eliminates "책상 정리" problem)
AZURE_OPENAI_ARCHITECT=o3-mini  # ✅ Active

# Tier 2: Coach - Quick encouragement and tips
AZURE_OPENAI_COACH=gpt-4o-mini  # ✅ Active

# Tier 3: Deep Dive - Recursive breakdown for 10+ min tasks
AZURE_OPENAI_DEEPDIVE=o3-mini  # ✅ Active

# Fallback - Used when primary models fail
AZURE_OPENAI_FALLBACK=gpt-4o-mini  # ✅ Active (temporary until gpt-4o available)
```

---

## Testing Current Setup

### Quick Test with gpt-4o-mini
```bash
# Test if gpt-4o-mini deployment is working
curl https://birth2death-openai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2025-01-01-preview \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY_HERE" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is a test message."
      }
    ],
    "max_tokens": 50
  }'
```

Expected response:
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1704470400,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

---

## Next Steps

### ✅ All Models Configured!

Both o3-mini and gpt-4o-mini are now active. Next actions:

1. **Test o3-mini deployment:**
   ```bash
   curl "https://birth2death-openai.openai.azure.com/openai/deployments/o3-mini/chat/completions?api-version=2025-01-01-preview" \
     -H "Content-Type: application/json" \
     -H "api-key: YOUR_API_KEY_HERE" \
     -d '{
       "messages": [
         {
           "role": "user",
           "content": "Break down this task: 프로젝트 제안서 작성"
         }
       ],
       "max_completion_tokens": 800
     }'
   ```

   **IMPORTANT:** o-series models (o1, o3) use `max_completion_tokens` instead of `max_tokens`!

2. **Implement Triple-Tier architecture in `azureOpenAIService.ts`**
   - See `TRIPLE_TIER_ARCHITECTURE_PLAN.md` Task 1.3 for full implementation
   - Replace current prompt that suggests "책상 정리"
   - Add model routing logic for Architect/Coach/Deep Dive tiers

3. **Test with real tasks:**
   - "프로젝트 제안서 작성" → Verify no "책상 정리" or "자료 모으기"
   - "운동 루틴 시작" → First step should be actual exercise (<2 min)
   - Check first subtask creates immediate value

---

## Current Issues to Fix

### 🚨 Critical: Current Prompt Causes "책상 정리" Problem
**File:** `backend/src/services/azureOpenAIService.ts` (Lines 46-72)

**Current prompt SUGGESTS preparation tasks:**
```typescript
content: `You are an ADHD Coach specialized in breaking down tasks...

OUTPUT FORMAT (strict JSON array):
[
  {
    "title": "Clear desk surface",  // ❌ This is the problem!
    "estimatedMinutes": 5,
    "stepType": "physical",
    "order": 0
  },
  {
    "title": "Open laptop and required applications",  // ❌ This too!
    "estimatedMinutes": 2,
    "stepType": "physical",
    "order": 1
  }
]
```

**This needs to be replaced with o3-mini Architect prompt** (see TRIPLE_TIER_ARCHITECTURE_PLAN.md)

### 🚨 Critical: Mock Data Also Has "책상 정리"
**File:** `backend/src/services/azureOpenAIService.ts` (Line 122)

```typescript
{ title: `Clear workspace and gather materials`, ... }  // ❌ Preparation task
```

**This should be replaced with value-first mock data**

---

## Security Notes

⚠️ **API Key is committed to .env file**
- This is acceptable for development/private repo
- For production, use Azure Key Vault or environment variables from hosting platform
- Never commit `.env` to public repositories (already in `.gitignore`)

---

## Cost Monitoring

### Current Usage Estimation
- **Active model:** gpt-4o-mini only
- **Cost:** ~$0.10 per 1K tokens
- **Expected:** $0.09/user/month for Coach tier only

### After o3-mini Integration
- **Architect (o3-mini):** $0.80 per 1K tokens
- **Coach (gpt-4o-mini):** $0.10 per 1K tokens
- **Total:** ~$5/user/month (see AI_MODEL_RESEARCH_2026.md for full analysis)

---

## Important API Differences

### o-series Models (o1, o3-mini, o3)
**Use `max_completion_tokens` instead of `max_tokens`**

```typescript
// ❌ Wrong - Will error
await client.getChatCompletions(deploymentName, messages, {
  maxTokens: 800  // Error: "unsupported_parameter"
});

// ✅ Correct
await client.getChatCompletions(deploymentName, messages, {
  maxCompletionTokens: 800  // Works with o-series
});
```

**Response includes reasoning tokens:**
```json
{
  "usage": {
    "completion_tokens": 500,
    "completion_tokens_details": {
      "reasoning_tokens": 450,  // Internal reasoning
      "accepted_prediction_tokens": 50  // Actual output
    },
    "total_tokens": 650
  }
}
```

**Cost calculation:** Total tokens includes reasoning tokens!

### GPT-4o Series (gpt-4o, gpt-4o-mini)
**Use standard `max_tokens`**

```typescript
// ✅ Correct for GPT-4o series
await client.getChatCompletions(deploymentName, messages, {
  maxTokens: 800
});
```

---

## Related Documents
- `AI_MODEL_RESEARCH_2026.md` - Model research and cost analysis
- `TRIPLE_TIER_ARCHITECTURE_PLAN.md` - Implementation roadmap
- `IMPLEMENTATION_QUICK_START.md` - Quick start guide
