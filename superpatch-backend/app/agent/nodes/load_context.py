import logging

from postgrest.exceptions import APIError

from app.agent.state import UnifiedAgentState
from app.db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

_EMPTY_CONTEXT = {
    "program": None,
    "current_phase": None,
    "current_week": None,
    "completed_skills": [],
    "skill_outputs": {},
}


async def load_context(state: UnifiedAgentState) -> dict:
    """Load coaching progress and context from Supabase for the current user."""
    user_id = state["user_id"]
    client = get_supabase_client()

    try:
        result = (
            client.table("d2c_coaching_progress")
            .select("program, current_phase, current_week, completed_skills, skill_outputs")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
    except (APIError, Exception) as exc:
        logger.debug("load_context: no coaching progress for user %s: %s", user_id, exc)
        return _EMPTY_CONTEXT

    if result is None or not getattr(result, "data", None):
        return _EMPTY_CONTEXT

    row = result.data
    return {
        "program": row.get("program"),
        "current_phase": row.get("current_phase"),
        "current_week": row.get("current_week"),
        "completed_skills": row.get("completed_skills") or [],
        "skill_outputs": row.get("skill_outputs") or {},
    }
