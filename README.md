# AI Privacy & Compliance Web App

A full-stack web application for AI compliance assessment and documentation, featuring a FastAPI backend and React frontend. This tool helps organizations assess and document their AI systems for regulatory compliance, including the Colorado AI Act (CAIA).

## Quick Start

1.  **Backend**:
    ```bash
    cd backend
    python -m venv venv
    # Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    # Edit .env to set OPENAI_API_KEY (or set DEMO_MODE=1)
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```

2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Open Browser**: Navigate to the URL shown in the frontend terminal (usually `http://localhost:5173`).

---

## Prerequisites

*   **Python 3.10+**
*   **Node.js 18+** and **npm**
*   **Git**

## Detailed Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ai-privacy
```

### 2. Backend Setup

The backend is built with FastAPI and handles the compliance logic, database interactions, and LLM integration.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**
    *   **Windows:**
        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```
    *   **macOS/Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Environment Configuration (.env):**
    Create a `.env` file in the `backend` directory. You can copy the example:
    ```bash
    cp .env.example .env
    ```
    
    **Required Variables:**
    *   `OPENAI_API_KEY`: Your OpenAI API key. Required unless `DEMO_MODE=1`.
    
    **Optional Variables:**
    *   `DEMO_MODE`: Set to `1` to enable demo mode (no OpenAI API calls, uses canned responses). Set to `0` for production (default).
    *   `OPENAI_MODEL`: The OpenAI model to use (e.g., `gpt-4o`, `gpt-4-turbo`). Defaults to `gpt-5-nano` in the code.
    *   `DATABASE_URL`: Database connection string. Defaults to `sqlite:///./app.db`.
    *   `MAX_REQUESTS_PER_MINUTE`: Rate limiting. Default is `60`.
    *   `INVITE_TOKEN`: Optional token for restricting access.

    **Example `.env`:**
    ```env
    OPENAI_API_KEY=sk-proj-...
    DEMO_MODE=0
    OPENAI_MODEL=gpt-4o
    ```

### 3. Frontend Setup

The frontend is a React application built with Vite.

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

You need to run both the backend and frontend servers simultaneously. It is recommended to use two separate terminal windows.

### Terminal 1: Backend

Ensure you are in the `backend` directory and your virtual environment is activated.

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

*   The API will be available at `http://localhost:8000`.
*   API Docs: `http://localhost:8000/docs`.

### Terminal 2: Frontend

Ensure you are in the `frontend` directory.

```bash
npm run dev
```

*   The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Changing Model Type

To change the AI model used for generating documentation:

1.  Open `backend/.env`.
2.  Add or update the `OPENAI_MODEL` variable.
    ```env
    OPENAI_MODEL=gpt-4-turbo
    ```
3.  Restart the backend server (Ctrl+C and run the `uvicorn` command again).

## Project Structure

*   **`backend/`**: FastAPI application.
    *   `main.py`: Entry point and core logic.
    *   `intake.py`: Router for intake forms.
    *   `outreach.py`: Router for outreach tools.
    *   `regs/`: Markdown files containing regulatory text.
    *   `demo/`: Demo data and templates.
*   **`frontend/`**: React application.
    *   `src/`: Source code.
    *   `vite.config.js`: Vite configuration.

## Troubleshooting

*   **Backend fails to start**: Ensure you have activated the virtual environment and installed requirements.
*   **OpenAI errors**: Check your `OPENAI_API_KEY` in `.env`. If you don't have a key, set `DEMO_MODE=1`.
*   **Frontend cannot connect to backend**: Ensure the backend is running on port 8000. If it's on a different port, you may need to update the API base URL in the frontend configuration.
