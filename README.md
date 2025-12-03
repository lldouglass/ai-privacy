# AI Privacy & Compliance Web App

AI compliance assessment tool for CAIA (California AI Accountability) regulations. Features compliance surveys, AI-powered documentation generation, RAG-based regulatory retrieval, and a compliance chatbot.

**Production:** https://app.clarynt.net

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows (or `source venv/bin/activate` on Mac/Linux)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables (backend/.env)
```env
DEMO_MODE=1                    # Set to 0 for production
OPENAI_API_KEY=your_key_here   # Required when DEMO_MODE=0
OPENAI_MODEL=gpt-5-nano        # Optional
DATABASE_URL=sqlite:///./app.db # Optional (PostgreSQL for production)
```

## Project Structure

```
ai-privacy/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── outreach.py          # Outreach router
│   ├── reg_retrieval.py     # RAG retrieval logic
│   ├── regs_index.json      # RAG index
│   ├── regs/                # Regulatory docs (markdown)
│   ├── demo/                # Demo data
│   └── static/              # Production frontend build
├── frontend/
│   ├── src/
│   │   ├── components/      # ComplianceChatbot, Wizard, Result, etc.
│   │   ├── pages/           # HomePage, SurveyPage, DocumentationPage, etc.
│   │   └── utils/           # analytics.ts
│   └── ...
├── ops/
│   ├── nginx.conf
│   └── start.sh
├── Dockerfile
└── fly.toml
```

## Tech Stack

**Backend:** FastAPI, SQLModel, OpenAI API, Pydantic, psycopg (PostgreSQL)

**Frontend:** React 18, Vite, MUI, React Router, Axios, Marked, jsPDF/html2pdf.js

**Database:** SQLite (dev), PostgreSQL (prod)
