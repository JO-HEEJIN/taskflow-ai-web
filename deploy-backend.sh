#!/bin/bash

# TaskFlow AI - Backend Deployment Script
# This script ensures deployment to the correct Azure resource group

set -e

echo "🚀 Deploying TaskFlow AI Backend..."
echo "📦 Resource Group: birth2death-imagine-cup-2026"
echo "🌍 Environment: taskflow-env"
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
echo "✅ Backend deployed successfully!"
echo "🌐 URL: https://taskflow-backend.bravesky-cb93d4eb.eastus.azurecontainerapps.io"
