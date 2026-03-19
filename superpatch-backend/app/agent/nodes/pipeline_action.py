import json
import os

from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState
from app.agent.tools.sales_write import (
    advance_contact_step,
    advance_follow_up_day,
    update_contact_fields,
)

PIPELINE_SYSTEM = """You are J.Ai, a SuperPatch sales assistant with pipeline management capabilities.
You can advance contacts through the sales pipeline, update follow-up days, and modify contact fields.

User ID: {user_id}

Sales pipeline steps in order:
add_contact -> opening -> discovery -> presentation -> samples -> followup -> closing -> objections -> purchase_links

Always confirm the action you're about to take before executing it.
After completing an action, summarize what changed.
"""


async def pipeline_action(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Execute pipeline mutations using tool-augmented LLM loop."""
    tools = [advance_contact_step, advance_follow_up_day, update_contact_fields]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    user_id = state["user_id"]
    system = SystemMessage(content=PIPELINE_SYSTEM.format(user_id=user_id))
    all_msgs = list(state["messages"])
    trimmed = [m for m in all_msgs if not isinstance(m, SystemMessage)][-10:]
    messages = [system] + trimmed

    while True:
        response = await model.ainvoke(messages, config=config)
        if not response.tool_calls:
            return {"messages": [response]}
        messages.append(response)
        for tc in response.tool_calls:
            tool_fn = tool_map[tc["name"]]
            result = await tool_fn.ainvoke(tc["args"], config=config)
            messages.append(
                ToolMessage(content=json.dumps(result, default=str), tool_call_id=tc["id"])
            )
