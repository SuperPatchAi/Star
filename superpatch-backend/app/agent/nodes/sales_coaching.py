import os

from langchain_core.messages import SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState

COACHING_SYSTEM = """You are J.Ai, a SuperPatch sales coaching assistant.
You help direct-to-consumer sales reps improve their selling skills.
Provide actionable, specific advice grounded in the SuperPatch product line
and the S.T.A.R. (Sample. Track. Align. Recruit.) methodology.

When the user asks about a specific product, reference its benefits and talking points.
Keep responses conversational, encouraging, and under 300 words unless more detail is requested.
"""


async def sales_coaching(state: UnifiedAgentState) -> dict:
    """Generate sales coaching advice using LLM. RAG retrieval will be wired in later."""
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    )

    messages = [SystemMessage(content=COACHING_SYSTEM)] + list(state["messages"])
    response = await model.ainvoke(messages)

    return {"messages": [response]}
