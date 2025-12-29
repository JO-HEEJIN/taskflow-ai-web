# Local Development Guide

## Quick Start

### 1. Start Backend (Terminal 1)
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

### 2. Start Frontend (Terminal 2)
```bash
cd frontend  
npm run dev
# Runs on http://localhost:3000
```

### 3. Access App
Open http://localhost:3000 in your browser

---

## Environment Setup

### Backend (.env file already exists)
The backend uses:
- Azure Cosmos DB (already configured)
- Azure OpenAI (already configured)
- Port 3001

### Frontend (.env.local for local development)
Create `frontend/.env.local`:
```bash
# Local backend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Auth (use existing production keys or set up local)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Testing Workflow

1. Make code changes locally
2. Test in browser at localhost:3000
3. Verify in both:
   - Guest mode (no login)
   - Authenticated mode (Google login)
4. Test specific features:
   - Task creation
   - AI breakdown
   - Focus Mode
   - Level up celebrations
   - AI encouragement

5. Only deploy when local tests pass:
```bash
# Commit changes
git add .
git commit -m "Your message"
git push origin main

# Deploy backend
cd backend
az containerapp up --name taskflow-backend --resource-group birth2death-imagine-cup-2026 --source .

# Deploy frontend  
cd frontend
az containerapp up --name taskflow-frontend --resource-group birth2death-imagine-cup-2026 --source .
```

---

## Common Issues

### Backend won't start
- Check Azure credentials are configured
- Verify .env file exists with correct keys

### Frontend can't reach backend
- Ensure NEXT_PUBLIC_API_URL=http://localhost:3001 in .env.local
- Check backend is running on port 3001

### Auth not working locally
- Use guest mode for testing (no login required)
- Or set up Google OAuth for localhost

---

## Performance Benefits

- Local testing: < 5 seconds
- Backend deployment: ~3 minutes
- Frontend deployment: ~3 minutes
- Total deployment: ~6 minutes

**Always test locally first to save 6 minutes per iteration!**
