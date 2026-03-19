import json
import os

from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts.jay_persona import JAY_PERSONA_PROMPT
from app.agent.state import UnifiedAgentState
from app.agent.tools.coaching_read import (
    compute_assessment_score,
    get_coaching_progress,
)

ASSESSMENT_SYSTEM = """{persona}

## Your Role

You are presenting coaching assessment results. Use your tools to load progress
data and compute scores, then interpret the results using Jay's voice.

## User Context

- User ID: {user_id}
- Program: {program}
- Current skill being assessed: {current_skill}
- Skills completed so far: {completed_skills}
{in_memory_outputs}

## Workflow

1. **Load progress**: Call `get_coaching_progress` with the user_id
   (and optionally the program) to retrieve their completed skills and
   stored answers.

2. **Score assessments**: For each completed skill that has a scoring rubric,
   call `compute_assessment_score` with the skill_id and the answers dict
   from the progress data (found in skill_outputs -> skill_id -> answers).
   If there are in-memory outputs listed above, use those answers instead.

3. **Present results in Jay's voice**:
   - Don't just read numbers — interpret them operationally
   - Tell the user what scores mean for their business
   - Where are they strong? Where are they lying to themselves?
   - What's the ONE thing they should change based on these results?

4. If no skills have been completed yet, challenge the user:
   "You're asking for a score but you haven't done any of the work yet.
   Let's fix that — which skill do you want to start with?"

## Critical Rules

- NEVER expose internal tool errors, retries, or technical details to the user.
  If a tool fails, handle it gracefully and explain in natural language.
- Do NOT narrate your tool calls. Just call them and present results naturally.
- Be direct about what the numbers mean
- Never let someone feel comfortable with a mediocre score
- Always end with a concrete next step
"""


async def coaching_assessment(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Provide coaching assessment with real scoring via tool-augmented LLM."""
    tools = [compute_assessment_score, get_coaching_progress]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    user_id = state["user_id"]
    program = state.get("program") or "100m_blueprint"
    current_skill = state.get("current_skill") or "none active"
    completed = state.get("completed_skills") or []
    skill_outputs = state.get("skill_outputs") or {}

    in_memory_section = ""
    if skill_outputs:
        in_memory_section = (
            "\n## In-Memory Skill Outputs (not yet saved to DB)\n"
            "Use these answers for scoring if they exist:\n```json\n"
            + json.dumps(skill_outputs, indent=2, default=str)
            + "\n```"
        )

    system = SystemMessage(
        content=ASSESSMENT_SYSTEM.format(
            persona=JAY_PERSONA_PROMPT,
            user_id=user_id,
            program=program,
            current_skill=current_skill,
            completed_skills=", ".join(completed) if completed else "none yet",
            in_memory_outputs=in_memory_section,
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
