from __future__ import annotations

from langchain_core.tools import tool

from app.db.supabase_client import get_supabase_client


@tool
def save_skill_completion(
    user_id: str,
    program: str,
    skill_id: str,
    answers: dict,
    scores: dict,
    actions: list[str],
) -> dict:
    """Save a completed coaching skill to the user's progress record.

    Upserts into d2c_coaching_progress: appends skill_id to the
    completed_skills array and merges the new answers, scores, and
    action items into skill_outputs keyed by skill_id.

    Args:
        user_id: The authenticated user's ID.
        program: Program identifier (e.g. 'founders_cohort').
        skill_id: The completed skill's identifier.
        answers: Dict of question_id -> user response.
        scores: Dict of dimension -> score from assessment.
        actions: List of action items the user committed to.

    Returns the updated coaching progress record.
    """
    try:
        sb = get_supabase_client()

        existing = (
            sb.table("d2c_coaching_progress")
            .select("*")
            .eq("user_id", user_id)
            .eq("program", program)
            .maybe_single()
            .execute()
        )

        skill_output = {
            "answers": answers,
            "scores": scores,
            "actions": actions,
        }

        if existing is not None and getattr(existing, "data", None):
            record = existing.data
            completed = record.get("completed_skills") or []
            if skill_id not in completed:
                completed.append(skill_id)

            outputs = record.get("skill_outputs") or {}
            outputs[skill_id] = skill_output

            result = (
                sb.table("d2c_coaching_progress")
                .update({
                    "completed_skills": completed,
                    "skill_outputs": outputs,
                })
                .eq("user_id", user_id)
                .eq("program", program)
                .single()
                .execute()
            )
            return result.data
        else:
            result = (
                sb.table("d2c_coaching_progress")
                .insert({
                    "user_id": user_id,
                    "program": program,
                    "completed_skills": [skill_id],
                    "skill_outputs": {skill_id: skill_output},
                    "current_phase": 1,
                    "current_week": 1,
                })
                .single()
                .execute()
            )
            return result.data
    except Exception as exc:
        return {"error": f"Failed to save skill completion: {exc}"}
