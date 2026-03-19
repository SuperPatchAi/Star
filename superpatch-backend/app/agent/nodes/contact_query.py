import json
import os

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState
from app.agent.tools.sales_read import (
    get_contact,
    get_follow_up_reminders,
    list_contacts_by_filter,
)

MAX_HISTORY = 10

CONTACT_SYSTEM = """You are J.Ai, a SuperPatch sales assistant.
You have access to tools that can look up contacts, list contacts by filter,
and check follow-up reminders. Use the user_id from context for all queries.

User ID: {user_id}

Always call tools to get real data before answering. Never guess contact information.
Present results clearly and concisely.
"""


async def contact_query(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Answer contact-related questions using tool-augmented LLM loop."""
    tools = [get_contact, list_contacts_by_filter, get_follow_up_reminders]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    user_id = state["user_id"]
    system = SystemMessage(content=CONTACT_SYSTEM.format(user_id=user_id))
    all_msgs = list(state["messages"])
    trimmed = [m for m in all_msgs if not isinstance(m, SystemMessage)][-MAX_HISTORY:]
    messages = [system] + trimmed

    max_iterations = 5
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
            messages.append(
                ToolMessage(content=json.dumps(result, default=str), tool_call_id=tc["id"])
            )
    return {"messages": [response]}
