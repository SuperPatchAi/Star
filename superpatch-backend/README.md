# SuperPatch S.T.A.R. — LangGraph Agent Backend

FastAPI backend powering the J.Ai agent for the SuperPatch S.T.A.R. sales enablement app. Uses LangGraph to orchestrate a stateful conversational agent with tool-calling, RAG retrieval, and domain-aware intent routing.

## Install

```bash
cd superpatch-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

The server starts on `http://localhost:8000`. Hit `GET /health` to verify.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google AI (Gemini) API key for the LLM |
| `SUPABASE_DB_URL` | Postgres connection string for pgvector / embeddings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side admin) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check — returns `{"status": "ok"}` |
| POST | `/chat` | SSE streaming chat endpoint (requires Bearer token) |

## Tests

```bash
pytest tests/ -v
```

Integration tests cover auth, intent routing, sales tools, coaching skills, assessment scoring, terminology enforcement, and FastAPI endpoints. All tests mock external dependencies (Supabase, Google API, LLM) and run offline.
