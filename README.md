# TaskFlow AI

**AI-Powered ADHD Task Management Platform**
*Microsoft Imagine Cup 2026 Submission*

## Overview

TaskFlow AI is an intelligent task management platform designed specifically for people with ADHD. Using Microsoft Azure AI services, it transforms overwhelming tasks into achievable micro-steps through AI-powered breakdown, gamification, and adaptive learning.

### Key Features

- **Triple-Tier AI Architecture**: Intelligent task breakdown using Azure OpenAI (o3-mini + GPT-4o-mini)
- **Focus Mode**: Immersive timer with constellation visualization and AI coaching
- **Traffic Light SRS**: Spaced repetition system for learning tasks with visual confidence indicators
- **Desktop Timer**: Native Electron app that works over fullscreen applications
- **Cross-Device Sync**: Seamless data synchronization via Azure Cosmos DB
- **Gamification**: XP system, streaks, and achievements to maintain motivation

## Live Demo

**Production URL**: https://taskflow-frontend.bravesky-cb93d4eb.eastus.azurecontainerapps.io

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Desktop App**: Electron (macOS/Windows)

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Real-time**: WebSocket (Socket.IO)

### Azure Services
- **Azure OpenAI Service**: Triple-tier AI architecture
  - o3-mini: Task Architect (intelligent breakdown)
  - GPT-4o-mini: ADHD Coach (encouragement & tips)
- **Azure Cosmos DB**: NoSQL database for tasks, notes, and conversations
- **Azure Container Apps**: Scalable container hosting

## Project Structure

```
taskflow-ai-web/
├── frontend/           # Next.js 15 frontend application
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   │   ├── focus/     # Focus Mode components
│   │   ├── mobile/    # Mobile-optimized views
│   │   └── graph/     # Constellation visualization
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities (API, Sound, etc.)
│   └── store/         # Zustand state management
├── backend/           # Express.js backend API
│   └── src/
│       ├── routes/    # API endpoints
│       └── services/  # Azure AI, Cosmos DB services
├── electron-timer/    # Desktop Timer app (Electron)
└── docs/              # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- Azure account with:
  - Azure OpenAI Service (o3-mini, GPT-4o-mini deployments)
  - Azure Cosmos DB

### Installation

```bash
# Clone repository
git clone https://github.com/JO-HEEJIN/taskflow-ai-web.git
cd taskflow-ai-web

# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit .env with your Azure credentials

# Run development servers
cd backend && npm run dev    # http://localhost:3001
cd frontend && npm run dev   # http://localhost:3000
```

## Architecture Highlights

### Triple-Tier AI System
1. **Architect Tier (o3-mini)**: Breaks down tasks using cognitive shuffling methodology
2. **Coach Tier (GPT-4o-mini)**: Provides real-time encouragement and ADHD-specific tips
3. **Deep Dive Tier (o3-mini)**: Recursive breakdown for complex subtasks (>10 minutes)

### Traffic Light SRS
Visual spaced repetition system for learning tasks:
- 🔴 Red: New/difficult (review soon)
- 🟡 Yellow: Learning (moderate interval)
- 🟢 Green: Mastered (long interval)

### Focus Mode
- Galaxy-themed immersive timer
- AI Coach chat integration
- Personal notes per subtask
- Constellation progress visualization

## Microsoft Azure Integration

| Service | Usage |
|---------|-------|
| Azure OpenAI (o3-mini) | Task breakdown, recursive decomposition |
| Azure OpenAI (GPT-4o-mini) | Coaching, encouragement generation |
| Azure Cosmos DB | Tasks, subtasks, notes, conversations |
| Azure Container Apps | Production hosting |

## Team

- **Organization**: birth2death LLC
- **Contact**: info@birth2death.com

---

**Built with Microsoft Azure AI for Imagine Cup 2026**
