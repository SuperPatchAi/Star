from langchain_core.messages import AIMessage

from app.agent.prompts.terminology import check_terminology
from app.agent.state import UnifiedAgentState


async def generate_response(state: UnifiedAgentState) -> dict:
    """Post-processing node: enforce SuperPatch terminology on the last AI message.

    Runs deterministic regex replacements — no LLM call, fast and predictable.
    Replaces banned/discouraged terms with brand-approved alternatives, then
    returns the (possibly corrected) message for the graph to emit.
    """
    messages = state["messages"]
    if not messages:
        return {"messages": []}

    last_msg = messages[-1]

    if isinstance(last_msg, AIMessage) and isinstance(last_msg.content, str):
        corrected = check_terminology(last_msg.content)
        if corrected != last_msg.content:
            last_msg = last_msg.model_copy(update={"content": corrected})

    return {"messages": [last_msg]}
