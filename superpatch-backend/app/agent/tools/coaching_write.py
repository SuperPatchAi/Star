from __future__ import annotations

from langchain_core.tools import tool

from app.db.supabase_client import get_supabase_client


@tool
def save_partial_progress(
    user_id: str,
    program: str,
    skill_id: str,
    answers_so_far: dict,
    current_question_index: int,
    total_questions: int,
) -> dict:
    """Save in-progress coaching skill state so it survives across sessions.

    Upserts into d2c_coaching_progress with the active skill, partial
    answers, and question progress. Does NOT mark the skill as completed.

    Args:
        user_id: The authenticated user's ID.
        program: Program identifier (e.g. '100m_blueprint').
        skill_id: The skill currently in progress.
        answers_so_far: Dict of question_id -> user response collected so far.
        current_question_index: 1-based index of the last answered question.
        total_questions: Total number of questions in this skill.

    Returns the upserted progress record.
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

        partial_output = {"partial_answers": answers_so_far, "status": "in_progress"}

        if existing is not None and getattr(existing, "data", None):
            outputs = existing.data.get("skill_outputs") or {}
            outputs[skill_id] = partial_output

            result = (
                sb.table("d2c_coaching_progress")
                .update({
                    "skill_outputs": outputs,
                    "current_skill": skill_id,
                    "current_question_index": current_question_index,
                    "total_questions": total_questions,
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
                    "completed_skills": [],
                    "skill_outputs": {skill_id: partial_output},
                    "current_skill": skill_id,
                    "current_question_index": current_question_index,
                    "total_questions": total_questions,
                    "current_phase": 1,
                    "current_week": 1,
                })
                .single()
                .execute()
            )
            return result.data
    except Exception as exc:
        return {"error": f"Failed to save partial progress: {exc}"}


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
    completed_skills array, merges the final answers/scores/actions into
    skill_outputs, and clears the in-progress tracking columns.

    Args:
        user_id: The authenticated user's ID.
        program: Program identifier (e.g. '100m_blueprint').
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
            "status": "completed",
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
                    "current_skill": None,
                    "current_question_index": 0,
                    "total_questions": 0,
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
                    "current_skill": None,
                    "current_question_index": 0,
                    "total_questions": 0,
                    "current_phase": 1,
                    "current_week": 1,
                })
                .single()
                .execute()
            )
            return result.data
    except Exception as exc:
        return {"error": f"Failed to save skill completion: {exc}"}
