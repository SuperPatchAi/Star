import logging
import os

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agent.state import UnifiedAgentState
from app.agent.nodes import (
    load_context,
    classify_intent,
    sales_coaching,
    contact_query,
    pipeline_action,
    analytics_query,
    skill_executor,
    coaching_assessment,
    coaching_progress,
    team_query,
    general_chat,
    generate_response,
)


def route_by_intent(state: UnifiedAgentState) -> str:
    return state.get("intent") or "general_chat"


builder = StateGraph(UnifiedAgentState)

builder.add_node("load_context", load_context)
builder.add_node("classify_intent", classify_intent)
builder.add_node("sales_coaching", sales_coaching)
builder.add_node("contact_query", contact_query)
builder.add_node("pipeline_action", pipeline_action)
builder.add_node("analytics_query", analytics_query)
builder.add_node("skill_executor", skill_executor)
builder.add_node("coaching_assessment", coaching_assessment)
builder.add_node("coaching_progress", coaching_progress)
builder.add_node("team_query", team_query)
builder.add_node("general_chat", general_chat)
builder.add_node("generate_response", generate_response)

builder.add_edge(START, "load_context")
builder.add_edge("load_context", "classify_intent")

builder.add_conditional_edges(
    "classify_intent",
    route_by_intent,
    {
        "sales_coaching": "sales_coaching",
        "contact_query": "contact_query",
        "pipeline_action": "pipeline_action",
        "analytics_query": "analytics_query",
        "skill_executor": "skill_executor",
        "coaching_assessment": "coaching_assessment",
        "coaching_progress": "coaching_progress",
        "team_query": "team_query",
        "general_chat": "general_chat",
    },
)

for intent_node in [
    "sales_coaching",
    "contact_query",
    "pipeline_action",
    "analytics_query",
    "skill_executor",
    "coaching_assessment",
    "coaching_progress",
    "team_query",
    "general_chat",
]:
    builder.add_edge(intent_node, "generate_response")

builder.add_edge("generate_response", END)

logger = logging.getLogger(__name__)
_compiled_graph = None


_pg_context_manager = None


async def _get_checkpointer():
    global _pg_context_manager
    db_url = os.environ.get("SUPABASE_DB_URL")
    if db_url:
        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

            _pg_context_manager = AsyncPostgresSaver.from_conn_string(db_url)
            saver = await _pg_context_manager.__aenter__()
            await saver.setup()
            logger.info("Using AsyncPostgresSaver for thread persistence")
            return saver
        except Exception as exc:
            logger.warning(
                "AsyncPostgresSaver setup failed, falling back to MemorySaver: %s",
                exc,
            )
            _pg_context_manager = None
    return MemorySaver()


async def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        checkpointer = await _get_checkpointer()
        _compiled_graph = builder.compile(checkpointer=checkpointer)
    return _compiled_graph
