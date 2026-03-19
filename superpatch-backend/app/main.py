from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.agent.graph import get_compiled_graph
from app.agent.nodes.error_handler import handle_error
from app.auth import validate_request
from app.rate_limit import RateLimiter

logger = logging.getLogger(__name__)

_DEFAULT_ORIGINS = [
    "https://star-seven-sigma.vercel.app",
    "http://localhost:3000",
]
_env_origins = os.environ.get("ALLOWED_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _env_origins.split(",") if o.strip()] or _DEFAULT_ORIGINS

app = FastAPI(title="SuperPatch S.T.A.R. Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = RateLimiter(max_requests=30, window_seconds=60)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if exc.status_code == 429:
        return JSONResponse(
            status_code=429,
            content={"detail": exc.detail},
            headers={"Retry-After": str(limiter.window_seconds)},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


class ChatContext(BaseModel):
    current_page: str | None = None
    selected_contact_id: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: ChatContext = Field(default_factory=ChatContext)
    session_id: str | None = None


def _to_langchain_messages(messages: list[ChatMessage]) -> list[Any]:
    mapping = {
        "user": HumanMessage,
        "assistant": AIMessage,
        "system": SystemMessage,
    }
    result = []
    for msg in messages:
        cls = mapping.get(msg.role, HumanMessage)
        result.append(cls(content=msg.content))
    return result


def _sse_event(event_type: str, data: dict[str, Any]) -> str:
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _is_rate_limit_error(exc: BaseException) -> bool:
    s = str(exc).lower()
    return "429" in s or "resource exhausted" in s or "rate limit" in s or "quota" in s


def _is_timeout_error(exc: BaseException) -> bool:
    s = str(exc).lower()
    return "deadline" in s or "timeout" in s or "timed out" in s


def _is_supabase_error(exc: BaseException) -> bool:
    s = str(exc).lower()
    t = type(exc).__name__.lower()
    return (
        "connect" in s or "connection" in s or "supabase" in s
        or "httpx" in t or "remoteprotocolerror" in t or "connecterror" in t
    )


async def _stream_agent(
    messages: list[ChatMessage],
    context: ChatContext,
    user_id: str,
    session_id: str | None = None,
) -> AsyncGenerator[str, None]:
    lc_messages = _to_langchain_messages(messages)

    initial_state = {
        "messages": lc_messages,
        "user_id": user_id,
        "current_page": context.current_page,
        "selected_contact_id": context.selected_contact_id,
    }

    thread_id = session_id or user_id
    config = {"configurable": {"thread_id": thread_id}}

    async def _run_stream():
        graph = await get_compiled_graph()
        async for event in graph.astream_events(
            initial_state,
            config=config,
            version="v2",
        ):
            kind = event.get("event")
            name = event.get("name", "")
            node = event.get("metadata", {}).get("langgraph_node", "")

            if kind not in ("on_chat_model_stream",):
                print(f"[EVENT] {kind} | name={name} | node={node}", flush=True)

            if kind == "on_chat_model_stream":
                node = event.get("metadata", {}).get("langgraph_node", "")
                if node == "classify_intent":
                    continue
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield _sse_event("text_delta", {"content": chunk.content})

            elif kind == "on_tool_start":
                tool_name = event.get("name", "")
                run_id = event.get("run_id", "")
                tool_input = event.get("data", {}).get("input", {})
                logger.info("SSE tool_call: %s", tool_name)
                yield _sse_event("tool_call", {
                    "tool": tool_name,
                    "call_id": run_id,
                    "input": tool_input,
                })

            elif kind == "on_tool_end":
                tool_name = event.get("name", "")
                run_id = event.get("run_id", "")
                output = event.get("data", {}).get("output", "")
                if hasattr(output, "content"):
                    output = output.content
                logger.info("SSE tool_result: %s (type=%s)", tool_name, type(output).__name__)
                if not isinstance(output, (dict, list, str, int, float, bool, type(None))):
                    output = str(output)
                yield _sse_event("tool_result", {
                    "tool": tool_name,
                    "call_id": run_id,
                    "output": output,
                })

    try:
        async for chunk in _run_stream():
            yield chunk
        yield _sse_event("done", {})

    except Exception as exc:
        if _is_rate_limit_error(exc):
            yield _sse_event(
                "rate_limited",
                {"message": "AI service is busy. Please wait and try again.", "retry_after_seconds": 60},
            )
            return
        if _is_timeout_error(exc):
            try:
                async for chunk in _run_stream():
                    yield chunk
                yield _sse_event("done", {})
                return
            except Exception as retry_exc:
                result = await handle_error({}, retry_exc)
                yield _sse_event("error", {"message": result["message"]})
            return
        if _is_supabase_error(exc):
            yield _sse_event(
                "service_unavailable",
                {"message": "Database service is temporarily unavailable. Please try again."},
            )
            return
        result = await handle_error({}, exc)
        yield _sse_event("error", {"message": result["message"]})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
async def chat(
    body: ChatRequest,
    authorization: str | None = Header(default=None),
) -> StreamingResponse:
    user_id = await validate_request(authorization)
    limiter.check(user_id)

    if not body.messages:
        raise HTTPException(status_code=422, detail="messages list cannot be empty")

    base_headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    base_headers.update(limiter.headers(user_id))
    return StreamingResponse(
        _stream_agent(body.messages, body.context, user_id, body.session_id),
        media_type="text/event-stream",
        headers=base_headers,
    )
