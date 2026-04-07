import json
import os

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState
from app.agent.tools.team_read import (
    get_team_activity,
    get_team_leaderboard,
    get_team_member_stats,
    get_team_overview,
    list_struggling_members,
)

MAX_HISTORY = 10

TEAM_SYSTEM = """You are J.Ai, a SuperPatch team coaching assistant.
You help leaders understand their team's performance, identify members
who need support, and celebrate top performers.

Team overview data has been preloaded below. You also have tools to dig
deeper: get individual member stats, find struggling members, view the
leaderboard, or check recent team activity. Use them freely to give
accurate, data-driven coaching advice.

Guidelines:
- Be encouraging and coaching-oriented
- Highlight wins before addressing issues
- Suggest specific actions when members are struggling
- Use the member's name when discussing individuals

User ID: {user_id}
"""


async def team_query(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Answer team performance questions with preloaded overview and tool loop."""
    user_id = state["user_id"]

    overview = await get_team_overview.ainvoke({"user_id": user_id}, config=config)

    tools = [
        get_team_overview,
        get_team_member_stats,
        list_struggling_members,
        get_team_leaderboard,
        get_team_activity,
    ]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    system = SystemMessage(content=TEAM_SYSTEM.format(user_id=user_id))
    all_msgs = list(state["messages"])
    trimmed = [m for m in all_msgs if not isinstance(m, SystemMessage)][-MAX_HISTORY:]

    messages = [system]
    messages.append(AIMessage(content="", tool_calls=[
        {"name": "get_team_overview", "args": {"user_id": user_id}, "id": "preload_overview"},
    ]))
    messages.append(ToolMessage(
        content=overview if isinstance(overview, str) else json.dumps(overview, default=str),
        tool_call_id="preload_overview",
    ))
    messages.extend(trimmed)

    max_iterations = 6
    for _ in range(max_iterations):
        response = await model.ainvoke(messages, config=config)
        if not response.tool_calls:
            return {"messages": [response]}
        messages.append(response)
        for tc in response.tool_calls:
            tool_fn = tool_map.get(tc["name"])
            if not tool_fn:
                messages.append(ToolMessage(
                    content=json.dumps({"error": f"Unknown tool: {tc['name']}"}),
                    tool_call_id=tc["id"],
                ))
                continue
            result = await tool_fn.ainvoke(tc["args"], config=config)
            content = result if isinstance(result, str) else json.dumps(result, default=str)
            messages.append(ToolMessage(content=content, tool_call_id=tc["id"]))

    return {"messages": [response]}
