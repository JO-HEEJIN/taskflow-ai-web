#!/bin/bash

# TaskFlow AI - Complete Deployment Script
# Deploys both frontend and backend to Azure Container Apps

set -e

echo "🚀 Deploying TaskFlow AI (Frontend + Backend)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Resource Group: birth2death-imagine-cup-2026"
echo "🌍 Environment: taskflow-env"
echo "🌐 Region: East US"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deploy Backend
echo "📡 Step 1/2: Deploying Backend..."
echo ""

cd backend

az containerapp up \
  --source . \
  --resource-group birth2death-imagine-cup-2026 \
  --environment taskflow-env \
  --name taskflow-backend \
  --ingress external \
  --target-port 3001

echo ""
echo "✅ Backend deployed!"
echo ""

# Return to root directory
cd ..

# Deploy Frontend
echo "🎨 Step 2/2: Deploying Frontend..."
echo ""

cd frontend

az containerapp up \
  --source . \
  --resource-group birth2death-imagine-cup-2026 \
  --environment taskflow-env \
  --name taskflow-frontend \
  --ingress external \
  --target-port 3000

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io"
echo "📡 Backend:  https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io"
echo ""
echo "🔍 Check logs:"
echo "   Frontend: az containerapp logs show -n taskflow-frontend -g birth2death-imagine-cup-2026 --follow"
echo "   Backend:  az containerapp logs show -n taskflow-backend -g birth2death-imagine-cup-2026 --follow"
echo ""
