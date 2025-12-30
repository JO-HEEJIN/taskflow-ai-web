#!/bin/bash

# TaskFlow AI - Frontend Deployment Script
# This script ensures deployment to the correct Azure resource group

set -e

echo "🚀 Deploying TaskFlow AI Frontend..."
echo "📦 Resource Group: birth2death-imagine-cup-2026"
echo "🌍 Environment: taskflow-env"
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
echo "✅ Frontend deployed successfully!"
echo "🌐 URL: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io"
