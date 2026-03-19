import os

from langchain_core.messages import SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import UnifiedAgentState

GENERAL_SYSTEM = """You are J.Ai, the SuperPatch AI assistant.
You help SuperPatch D2C representatives with their business.
Be friendly, professional, and helpful.
If the user seems to be asking about sales, contacts, or coaching,
gently guide them to ask more specifically so you can use your specialized capabilities.
Keep responses concise and actionable.
"""


async def general_chat(state: UnifiedAgentState) -> dict:
    """Handle general conversation that doesn't match a specific intent."""
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
    )

    messages = [SystemMessage(content=GENERAL_SYSTEM)] + list(state["messages"])
    response = await model.ainvoke(messages)

    return {"messages": [response]}
