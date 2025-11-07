# AI Privacy & Compliance Web App

A full-stack web application for AI compliance assessment and documentation, featuring a FastAPI backend and React frontend.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)

## Overview

This application helps organizations assess and document their AI systems for regulatory compliance, including CAIA (California AI Accountability) and other AI governance frameworks.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** and **npm** - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **(Optional) OpenAI API Key** - Required for production mode. Demo mode works without it.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-privacy.git
cd ai-privacy
```

### 2. Backend Setup

#### Create a Python Virtual Environment

**On Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the **backend** directory with the following variables:

```env
# Optional: Enable demo mode (1) or production mode (0)
DEMO_MODE=1

# Required for production mode (DEMO_MODE=0)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize OpenAI model
OPENAI_MODEL=gpt-4

# Optional: Database configuration (defaults to SQLite)
DATABASE_URL=sqlite:///./app.db

# Optional: Rate limiting
MAX_REQUESTS_PER_MINUTE=60

# Optional: Invite token for restricted access
INVITE_TOKEN=

# Optional: Pricing per 1K tokens
OPENAI_PRICE_PER_1K=0.03
```

**Note:** 
- For testing/demo purposes, set `DEMO_MODE=1` and you won't need an OpenAI API key
- For production use, set `DEMO_MODE=0` and provide a valid `OPENAI_API_KEY`

## Running the Application

You'll need to run both the backend and frontend servers simultaneously. Open two terminal windows:

### Terminal 1: Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (if not already activated)
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Start the FastAPI server with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

- API Documentation (Swagger): `http://localhost:8000/docs`
- Alternative API Docs (ReDoc): `http://localhost:8000/redoc`

### Terminal 2: Start the Frontend Development Server

```bash
# Navigate to frontend directory
cd frontend

# Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or another port if 5173 is busy)

### Access the Application

Open your browser and navigate to the URL shown in the frontend terminal output (typically `http://localhost:5173`).

## Project Structure

```
ai-privacy/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── outreach.py          # Outreach tools router
│   ├── reg_retrieval.py     # Regulation retrieval logic
│   ├── requirements.txt     # Python dependencies
│   ├── regs/               # Regulatory documentation
│   ├── demo/               # Demo data and samples
│   └── static/             # Built frontend assets (production)
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx         # Main React component
│   │   └── main.jsx        # React entry point
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.js      # Vite configuration
│   └── index.html          # HTML template
├── ops/
│   └── nginx.conf          # NGINX configuration (production)
└── README.md               # This file
```

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **SQLModel** - SQL database ORM
- **OpenAI API** - AI-powered compliance analysis
- **Pydantic** - Data validation

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Database
- **SQLite** - Default database (development)
- **PostgreSQL** - Optional (production)

## Development Commands

### Backend

```bash
# Run with auto-reload (development)
uvicorn main:app --reload

# Run in production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Run tests (if available)
pytest
```

### Frontend

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

### Backend Issues

**Issue: Module not found errors**
- Ensure your virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

**Issue: Database errors**
- Delete `backend/app.db` and restart the server to recreate the database

**Issue: OpenAI API errors**
- Check that your `OPENAI_API_KEY` is valid in the `.env` file
- Or set `DEMO_MODE=1` to use demo mode

### Frontend Issues

**Issue: Port already in use**
- Vite will automatically try another port
- Or manually specify: `npm run dev -- --port 3000`

**Issue: Module not found**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Issue: Cannot connect to backend**
- Ensure the backend server is running on port 8000
- Check CORS settings in `backend/main.py`

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions, please open an issue on the GitHub repository.

