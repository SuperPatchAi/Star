import json
import os

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState
from app.agent.tools.sales_read import get_dashboard_stats, get_sales_analytics

MAX_HISTORY = 10

ANALYTICS_SYSTEM = """You are J.Ai, a SuperPatch sales analytics assistant.
Dashboard stats and sales analytics have already been loaded for you (see tool
results below). Present numbers clearly with percentages, comparisons, and
actionable insights. If the user asks about trends, note you only have a current snapshot.

User ID: {user_id}
"""


async def analytics_query(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Answer analytics questions — always loads fresh data via tools."""
    user_id = state["user_id"]

    stats = await get_dashboard_stats.ainvoke({"user_id": user_id}, config=config)
    analytics = await get_sales_analytics.ainvoke({"user_id": user_id}, config=config)

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    )

    system = SystemMessage(content=ANALYTICS_SYSTEM.format(user_id=user_id))
    all_msgs = list(state["messages"])
    trimmed = [m for m in all_msgs if not isinstance(m, SystemMessage)][-MAX_HISTORY:]

    messages = [system]
    messages.append(AIMessage(content="", tool_calls=[
        {"name": "get_dashboard_stats", "args": {"user_id": user_id}, "id": "preload_stats"},
        {"name": "get_sales_analytics", "args": {"user_id": user_id}, "id": "preload_analytics"},
    ]))
    messages.append(ToolMessage(
        content=json.dumps(stats, default=str), tool_call_id="preload_stats",
    ))
    messages.append(ToolMessage(
        content=json.dumps(analytics, default=str), tool_call_id="preload_analytics",
    ))
    messages.extend(trimmed)

    response = await model.ainvoke(messages, config=config)
    return {"messages": [response]}
