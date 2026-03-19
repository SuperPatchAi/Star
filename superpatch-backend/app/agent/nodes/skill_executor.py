import json
import os
import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts.jay_persona import JAY_PERSONA_PROMPT
from app.agent.state import UnifiedAgentState
from app.agent.tools.coaching_read import (
    compute_assessment_score,
    load_skill_definition,
)
from app.agent.tools.coaching_write import save_partial_progress, save_skill_completion
from app.agent.tools.sales_read import get_dashboard_stats, get_sales_analytics
from app.coaching.registry import get_skills_for_program

MAX_HISTORY = 20

SKILL_SYSTEM = """{persona}

## Your Role

You are facilitating an interactive coaching skill session. The skill
definition has already been loaded for you (see tool result below).
Use `compute_assessment_score` to score and `save_skill_completion` to persist.

## User Context

- User ID: {user_id}
- Program: {program}
- Current skill: {current_skill}
- Completed skills: {completed_skills}

## Workflow

1. The skill definition is already loaded. Use the data below.

2. **Introduce it**: Explain what this skill is about and why it matters —
   in Jay's voice. Reference the frameworks and context from the loaded data.

3. **Ask questions ONE AT A TIME**: Present the first question from the skill
   definition. Wait for the user's answer before proceeding.
   - If the answer is vague, push back: "That's a nice answer for a journal.
     Give me the real one."
   - After each answer, acknowledge briefly with a coaching insight, then move
     to the next question.
   - If there is a case study, weave it in naturally when it connects.
   - **IMPORTANT**: After EVERY user answer, call `save_partial_progress` with:
     user_id: "{user_id}", program: "{program}", skill_id (the current skill),
     answers_so_far (dict of question_id -> answer for all questions answered
     so far), current_question_index (1-based number of last answered question),
     and total_questions (total number of questions in the skill definition).
     This persists progress so the user can resume later.

4. **When ALL questions are answered**:
   - Summarize their key insights
   - Assign the action items from the skill
   - If the skill has a scoring rubric, call `compute_assessment_score` with
     the skill_id and a dict mapping each question ID to the user's answer
   - Call `save_skill_completion` to persist the results with:
     user_id, program, skill_id, answers dict, scores dict (or empty), and
     the action items list from the skill definition

## Using Real Sales Data in Coaching

You have access to `get_dashboard_stats` and `get_sales_analytics`. Use them
strategically during coaching to ground your insights in the user's REAL numbers:

- **When to pull stats**: When the user's answer involves time commitment,
  results, performance, effort level, income-producing activities, or
  conversion — call `get_dashboard_stats` (pass user_id: "{user_id}").
  For pattern analysis, also call `get_sales_analytics` (pass user_id: "{user_id}").
- **How to frame stats**: ALWAYS connect the data back to their coaching answer.
  Example: "You said you spend 20% of your time on income-producing activities.
  Let's look at what that actually means — you've got 4 contacts in your
  pipeline and a 0% win rate. That's what 20% effort produces. The math
  doesn't lie."
- **Pattern**: Show the data → deliver the coaching insight → ask the next
  question. Never show stats without connecting them to the coaching context.
- Do NOT call stats tools on every turn — only when the user's answer reveals
  something about their effort, results, or commitment that real data can
  reinforce or challenge.

## Critical Rules

- NEVER expose internal tool errors, retries, or technical details to the user.
- Do NOT narrate your tool calls. Just call them and present results naturally.
- Present questions one at a time — never dump the full list
- Challenge surface-level or vague answers
- Every insight must end with a concrete next step
- Follow Jay's voice: direct, operator-minded, no fluff or cheerleading
"""


def _build_skill_catalog(program: str, completed: list[str]) -> str:
    skills = get_skills_for_program(program)
    if not skills:
        return "No skills found for this program."
    lines = []
    for s in skills:
        status = "DONE" if s.id in completed else "    "
        lines.append(f"[{status}] {s.id} — {s.name} (Phase {s.phase}, Week {s.week})")
    return "\n".join(lines)


def _infer_skill_id(user_text: str, program: str, completed: list[str]) -> str | None:
    """Try to match the user's message to a skill ID from the catalog."""
    skills = get_skills_for_program(program)
    if not skills:
        return None
    text_lower = user_text.lower()
    for s in skills:
        if s.id in text_lower or s.name.lower() in text_lower:
            return s.id
    for s in skills:
        name_words = s.name.lower().split()
        if any(w in text_lower for w in name_words if len(w) > 3):
            return s.id
    for s in skills:
        if s.id not in completed:
            return s.id
    return skills[0].id if skills else None


def _trim_messages(msgs: list, max_count: int) -> list:
    """Keep system message + last N conversation messages."""
    system = [m for m in msgs if isinstance(m, SystemMessage)]
    rest = [m for m in msgs if not isinstance(m, SystemMessage)]
    if len(rest) <= max_count:
        return system + rest
    return system + rest[-max_count:]


async def skill_executor(state: UnifiedAgentState, config: RunnableConfig) -> dict:
    """Facilitate an interactive coaching skill session using tool-augmented LLM."""
    tools = [
        compute_assessment_score,
        save_skill_completion,
        save_partial_progress,
        get_dashboard_stats,
        get_sales_analytics,
    ]
    tool_map = {t.name: t for t in tools}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    ).bind_tools(tools)

    user_id = state["user_id"]
    program = state.get("program") or "100m_blueprint"
    current_skill = state.get("current_skill") or ""
    completed = state.get("completed_skills") or []

    all_msgs = list(state["messages"])
    last_user_text = ""
    for m in reversed(all_msgs):
        if isinstance(m, HumanMessage):
            last_user_text = m.content
            break

    skill_id = current_skill or _infer_skill_id(last_user_text, program, completed)

    skill_data = None
    if skill_id:
        skill_data = await load_skill_definition.ainvoke(
            {"skill_id": skill_id}, config=config
        )

    system = SystemMessage(
        content=SKILL_SYSTEM.format(
            persona=JAY_PERSONA_PROMPT,
            user_id=user_id,
            program=program,
            current_skill=skill_id or "none",
            completed_skills=", ".join(completed) if completed else "none yet",
        )
    )

    messages = [system] + _trim_messages(all_msgs, MAX_HISTORY)

    if skill_data:
        messages.append(AIMessage(content="", tool_calls=[{
            "name": "load_skill_definition",
            "args": {"skill_id": skill_id},
            "id": "preload_skill",
        }]))
        messages.append(ToolMessage(
            content=json.dumps(skill_data, default=str),
            tool_call_id="preload_skill",
        ))

    skill_completed = False
    max_iterations = 5
    for iteration in range(max_iterations):
        response = await model.ainvoke(messages, config=config)
        if not response.tool_calls:
            return {
                "messages": [response],
                "current_skill": None if skill_completed else skill_id,
            }
        messages.append(response)
        for tc in response.tool_calls:
            if tc["name"] == "save_skill_completion":
                skill_completed = True
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
    return {
        "messages": [response],
        "current_skill": None if skill_completed else skill_id,
    }
