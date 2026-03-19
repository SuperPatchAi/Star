import os
from typing import Literal

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from app.agent.state import UnifiedAgentState

INTENT_OPTIONS = Literal[
    "sales_coaching",
    "contact_query",
    "pipeline_action",
    "analytics_query",
    "skill_executor",
    "coaching_assessment",
    "coaching_progress",
    "general_chat",
]


class IntentClassification(BaseModel):
    intent: INTENT_OPTIONS = Field(
        description="The classified intent of the user message."
    )


SYSTEM_PROMPT = """You are an intent classifier for a sales enablement assistant.
Classify the user's message into exactly one of these intents:

- sales_coaching: asking for sales advice, scripts, objection handling tips, or coaching on selling
- contact_query: asking about a specific contact, listing contacts, or checking follow-up reminders
- pipeline_action: requesting to move a contact forward, update contact info, or advance follow-up
- analytics_query: asking about stats, performance, conversion rates, or dashboards
- skill_executor: requesting to start or continue a coaching skill/exercise/worksheet
- coaching_assessment: asking about assessment scores, evaluation, or grading
- coaching_progress: asking about their learning progress, completed skills, or curriculum status
- general_chat: greetings, off-topic, or anything that doesn't fit the above

Use the following context signals to help classify:
- selected_contact_id present: {has_contact}
- current_skill active: {has_skill}
"""


_EXIT_PHRASES = frozenset({
    "stop", "exit", "cancel", "quit", "nevermind", "never mind",
    "go back", "end session", "leave", "done with this",
})


async def classify_intent(state: UnifiedAgentState) -> dict:
    """Classify the user's message intent using structured LLM output.

    When a coaching skill is active, stay in skill_executor unless
    the user explicitly asks to leave the session.
    """
    if state.get("current_skill"):
        last_msg = (
            state["messages"][-1].content.strip().lower()
            if state.get("messages")
            else ""
        )
        if not any(phrase in last_msg for phrase in _EXIT_PHRASES):
            return {"intent": "skill_executor"}
        return {"intent": "general_chat", "current_skill": None}

    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    )
    structured_model = model.with_structured_output(IntentClassification)

    has_contact = "yes" if state.get("selected_contact_id") else "no"

    system_msg = SYSTEM_PROMPT.format(
        has_contact=has_contact,
        has_skill="no",
    )

    messages = state["messages"]
    last_user_msg = messages[-1].content if messages else ""

    result: IntentClassification = await structured_model.ainvoke(
        [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": last_user_msg},
        ]
    )

    return {"intent": result.intent}
