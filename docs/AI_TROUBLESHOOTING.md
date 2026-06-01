# AI Troubleshooting — "AI가 작동 안 해"

When AI features (task breakdown, coaching) stop working, follow this in order.
**Most common cause: the Azure OpenAI key expired.**

## 0. Background — there are TWO AI engines

| Feature | Engine | Resource |
|---|---|---|
| Task breakdown, AI coach, encouragement, clarify questions (**core AI**) | **Azure OpenAI** | `birth2death-openai` |
| Textbook / syllabus PDF·URL·text parsing only | **Claude (Anthropic)** | Anthropic account |

⚠️ **Silent mock fallback:** when an Azure OpenAI call fails, the backend quietly returns
hardcoded **mock data** instead of erroring (e.g. Korean subtasks like `"...의 핵심 목표 1문장 작성"`,
or the coach line `"Let's break this down together. What feels hardest about this task?"`).
So "AI looks like it answers but the output is generic/wrong" usually means **the Azure key is dead.**

---

## 1. Which engine is broken? (one curl)

Hit the **backend** directly (not the browser).

```bash
BASE="https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io"

# Core AI (Azure OpenAI) — the streaming endpoint tells the truth (no mock fallback)
curl -sN "$BASE/api/ai/breakdown-stream?taskTitle=Write%20a%20paper" | grep '"type":"'
```

- `"type":"error","error":"Streaming failed"` → **Azure OpenAI key dead** → go to step 2
- Real sentences (actual paper-writing steps) → Azure is fine
- Output like `"...의 핵심 목표 1문장 작성"` → **mock fallback = Azure dead**

Check Claude (textbook parsing) only if that feature is the problem:

```bash
curl -s -X POST "$BASE/api/textbooks/parse/text" -H "Content-Type: application/json" \
  -d '{"text":"Chapter 1: Intro\nChapter 2: Cells"}'
```
- `"credit balance is too low"` → **top up Claude credits** at console.anthropic.com → Plans & Billing
  (This is separate from Azure and only affects textbook parsing.)

---

## 2. Verify the NEW Azure key actually works (before changing anything)

Azure Portal → `birth2death-openai` → **Keys and Endpoint** → copy a key.

```bash
EP="https://birth2death-openai.openai.azure.com"
KEY="<new-key>"

curl -s -X POST "$EP/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-12-01-preview" \
  -H "Content-Type: application/json" -H "api-key: $KEY" \
  -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":10}' -w "\n[%{http_code}]\n"
```
- `[200]` + `"Hello!"` → key OK, go to step 3
- `[401]` → key/resource problem (check the subscription & resource are still alive in Portal)

---

## 3. Apply to production (the key part — editing `.env` is NOT enough)

⚠️ `backend/.env` is `.dockerignore`d, so it only affects **local dev**.
Production reads the key from a Container App **secret**. The env var `AZURE_OPENAI_API_KEY`
is a `secretRef` to the secret named `azure-openai-api-key`.

```bash
# 1) az login (the token expires after ~90 days of inactivity)
az login --tenant b7aa0dc7-e005-4136-ab20-19b218c2149b

# 2) replace the secret value
az containerapp secret set -n taskflow-backend -g birth2death-imagine-cup-2026 \
  --secrets azure-openai-api-key="<new-key>"

# 3) find the active revision
az containerapp revision list -n taskflow-backend -g birth2death-imagine-cup-2026 \
  --query "[?properties.active].name" -o tsv

# 4) restart it (a secret change is only picked up on restart)
az containerapp revision restart -n taskflow-backend -g birth2death-imagine-cup-2026 \
  --revision <name-from-step-3>
```

---

## 4. Confirm recovery

Re-run the streaming curl from step 1 — real sentences instead of `"Streaming failed"` = fixed.
If you also develop locally, update `AZURE_OPENAI_API_KEY` in `backend/.env` to the same value.

---

## One-liner to remember

> **AI broken ≈ Azure key expired. Swap the Container App secret + restart the revision. Editing `.env` alone does nothing in production.**
