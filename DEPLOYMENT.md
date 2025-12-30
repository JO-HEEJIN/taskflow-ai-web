# TaskFlow AI - Deployment Guide

## Azure Resource Configuration

**IMPORTANT**: TaskFlow AI uses the following Azure resources. **DO NOT** create new resource groups for deployment.

### Production Resources
- **Resource Group**: `birth2death-imagine-cup-2026`
- **Environment**: `taskflow-env`
- **Region**: `East US`

### Deployed Services
- **Frontend**: `taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io`
- **Backend**: `taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io`

---

## Deployment Scripts

### Quick Deploy (Both Services)
```bash
./deploy-all.sh
```

### Deploy Frontend Only
```bash
./deploy-frontend.sh
```

### Deploy Backend Only
```bash
./deploy-backend.sh
```

---

## Manual Deployment

If you need to deploy manually, **always** use these exact parameters:

### Frontend Deployment
```bash
cd frontend
az containerapp up \
  --source . \
  --resource-group birth2death-imagine-cup-2026 \
  --environment taskflow-env \
  --name taskflow-frontend \
  --ingress external \
  --target-port 3000
```

### Backend Deployment
```bash
cd backend
az containerapp up \
  --source . \
  --resource-group birth2death-imagine-cup-2026 \
  --environment taskflow-env \
  --name taskflow-backend \
  --ingress external \
  --target-port 3001
```

---

## Environment Variables

### Frontend (Dockerfile)
The frontend Dockerfile contains a hardcoded backend URL:
```
ENV NEXT_PUBLIC_API_URL=https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
```

**WARNING**: If you change the backend URL, update `frontend/Dockerfile` line 19.

### Backend (Environment Variables)
Set via Azure Portal or CLI:
- `AZURE_COSMOS_ENDPOINT`
- `AZURE_COSMOS_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT_NAME`

---

## Monitoring

### View Logs
```bash
# Frontend logs
az containerapp logs show -n taskflow-frontend -g birth2death-imagine-cup-2026 --follow

# Backend logs
az containerapp logs show -n taskflow-backend -g birth2death-imagine-cup-2026 --follow
```

### Check Health
```bash
# Frontend
curl https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io

# Backend health endpoint
curl https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io/health
```

---

## Troubleshooting

### CORS Errors
If you encounter CORS errors:
1. Verify backend allows `azurecontainerapps.io` origins (see `backend/src/server.ts` line 28)
2. Check frontend Dockerfile has correct backend URL (line 19)
3. Redeploy both services

### Resource Group Confusion
If deployment creates a new resource group:
1. **Stop the deployment**
2. Use the deployment scripts (`deploy-*.sh`) which specify the correct group
3. Delete any accidentally created resource groups:
   ```bash
   az group delete --name <wrong-group-name> --yes
   ```

### URL Changes
URLs should **NEVER** change. If they do:
1. Check you're deploying to the correct resource group
2. Verify the environment name is `taskflow-env`
3. Use the deployment scripts to ensure consistency

---

## Cost Management

### Clean Up Old Resources
```bash
# List all resource groups
az group list --query "[].name" -o table

# Delete duplicate/unused groups (BE CAREFUL!)
az group delete --name <unused-group> --yes
```

### Check Current Costs
```bash
az consumption usage list --start-date 2025-12-01 --end-date 2025-12-31
```

---

## Pre-Deployment Checklist

- [ ] All code changes committed to git
- [ ] Frontend Dockerfile points to correct backend URL
- [ ] Backend CORS settings allow frontend domain
- [ ] Environment variables set in Azure Portal (if changed)
- [ ] Using deployment scripts (not manual commands)
- [ ] Deploying to `birth2death-imagine-cup-2026` resource group

---

## Post-Deployment Verification

1. **Frontend**: Visit https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io
2. **Backend Health**: `curl https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io/health`
3. **Test AI Breakdown**: Create a task and generate AI breakdown
4. **Test Focus Mode**: Enter focus mode and verify it works
5. **Check Logs**: Verify no errors in container logs

---

**Last Updated**: 2025-12-30
**Maintained By**: TaskFlow AI Team
