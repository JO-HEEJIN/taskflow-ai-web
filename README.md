# TaskFlow AI

AI-Powered Task Management Web Application for Microsoft Imagine Cup 2026

## Overview

TaskFlow AI is an intelligent task management platform that leverages Microsoft Azure AI services to provide:

- **AI-Powered Task Breakdown**: Automatically decompose complex tasks into actionable subtasks using Azure OpenAI GPT-4o
- **Visual Progress Tracking**: Real-time percentage and graphical progress indicators
- **Cross-Device Sync**: Simple sync codes enable seamless data synchronization without account registration
- **Responsive Design**: Modern, mobile-first interface for desktop and mobile devices
- **Smart Notifications**: Azure-powered push notifications for task reminders

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts for progress visualization

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: Azure Cosmos DB (NoSQL)
- **API**: RESTful API

### Azure Services
- **Azure OpenAI Service**: GPT-4o for intelligent task breakdown
- **Azure AI Language**: Text analytics for task categorization
- **Azure Cosmos DB**: Globally distributed NoSQL database
- **Azure App Service**: Web application hosting
- **Azure Notification Hubs**: Cross-platform push notifications

## Project Structure

```
taskflow-ai-web/
├── frontend/          # Next.js 14 frontend application
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utility functions
│   ├── store/        # Zustand state management
│   └── types/        # TypeScript type definitions
├── backend/          # Express.js backend API
│   ├── src/
│   │   ├── routes/   # API route handlers
│   │   ├── services/ # Business logic (Azure AI, DB)
│   │   ├── models/   # Data models
│   │   ├── middleware/ # Express middleware
│   │   └── types/    # TypeScript types
│   └── dist/         # Compiled JavaScript
├── docs/             # Project documentation
└── tasks/            # Implementation plan and todos
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Azure account with the following resources:
  - Azure OpenAI Service
  - Azure Cosmos DB
  - Azure AI Language
  - (Optional) Azure Notification Hubs

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd taskflow-ai-web
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install
```

3. **Install backend dependencies**
```bash
cd ../backend
npm install
```

4. **Configure environment variables**

Backend (`backend/.env`):
```bash
cp .env.example .env
# Edit .env with your Azure credentials
```

### Running the Application

**Development Mode:**

1. Start the backend server:
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

2. Start the frontend (in a new terminal):
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

**Production Build:**

```bash
# Build frontend
cd frontend
npm run build
npm start

# Build backend
cd ../backend
npm run build
npm start
```

## Azure Setup

### 1. Azure OpenAI Service
1. Create an Azure OpenAI resource in Azure Portal
2. Deploy GPT-4o model
3. Copy endpoint and API key to `.env`

### 2. Azure Cosmos DB
1. Create Cosmos DB account (NoSQL API)
2. Create database: `taskflow-ai`
3. Copy endpoint and key to `.env`

### 3. Azure AI Language
1. Create Language Service resource
2. Copy endpoint and API key to `.env`

See `/docs` for detailed setup instructions.

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks for device
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/breakdown` - AI task breakdown

### Device Sync
- `GET /api/sync/code` - Generate sync code
- `POST /api/sync/link` - Link device to sync code

## Features

### Core Features (MVP)
- ✅ Task CRUD operations
- ✅ AI-powered task breakdown
- ✅ Progress visualization
- ✅ Device synchronization without accounts
- ✅ Responsive design

### Planned Features
- Web push notifications
- Task categorization
- Due date reminders
- Team collaboration

## Development Timeline

- **Dec 24**: Project setup ✅
- **Dec 25-26**: Backend development
- **Dec 27-29**: Frontend development
- **Dec 30-31**: Integration & testing
- **Jan 1**: Production deployment
- **Jan 2**: A/B testing
- **Jan 3-9**: Final polish & submission

## Microsoft Imagine Cup 2026

This project is being developed for the Microsoft Imagine Cup 2026 competition, demonstrating the integration of multiple Microsoft Azure AI services to solve real-world productivity challenges.

**Required AI Services (2+):**
- ✅ Azure OpenAI Service
- ✅ Azure AI Language
- ✅ Azure Notification Hubs

## License

MIT License

## Contact

- **Developer**: Momo
- **Organization**: birth2death LLC
- **Email**: momo@birth2death.com

---

**Built with Microsoft Azure AI** 🚀
