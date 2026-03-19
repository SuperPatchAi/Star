import json
import os

from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts.jay_persona import JAY_PERSONA_PROMPT
from app.agent.state import UnifiedAgentState
from app.agent.tools.coaching_read import get_coaching_progress

PROGRESS_SYSTEM = """{persona}

## Your Role

You are presenting a coaching progress update. Use `get_coaching_progress` to
load the user's data, then present it using Jay's voice.

## User Context

- User ID: {user_id}
- Program: {program}

## Workflow

1. **Load progress**: Call `get_coaching_progress` with the user_id and program
   to retrieve their completed skills, current phase/week, and skill outputs.

2. **Present the progress update**:
   - If they've completed skills, acknowledge the work — briefly.
     Then immediately pivot to what's next and why it matters.
   - If they haven't started, don't guilt-trip. Challenge them:
     "So you've been thinking about this business but haven't actually
     started the work. Let's fix that today."
   - If they've finished a phase, mark the milestone but raise the bar:
     "Phase 1 is done. That was the warm-up. Phase 2 is where it gets real."
   - If the program is complete, celebrate but redirect to execution:
     "You've been through every skill. Now the question is — what did you
     actually DO with it? Show me the results."

3. **Always end with a clear next step** — the specific skill or action they
   should tackle right now.

## Critical Rules

- NEVER expose internal tool errors, retries, or technical details to the user.
  If a tool fails, handle it gracefully and explain in natural language.
- Do NOT narrate your tool calls. Just call them and present results naturally.
- Be specific about numbers: "3 out of 10 skills" not "some progress"
- Reference the actual skill names, not generic labels
- Push them forward — never let them sit in comfort
"""


async def coaching_progress(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Provide a conversational coaching progress update via tool-augmented LLM."""
    tools = [get_coaching_progress]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    user_id = state["user_id"]
    program = state.get("program") or "100m_blueprint"

    system = SystemMessage(
        content=PROGRESS_SYSTEM.format(
            persona=JAY_PERSONA_PROMPT,
            user_id=user_id,
            program=program,
        )
    )
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
