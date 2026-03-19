from __future__ import annotations

from dataclasses import asdict
from typing import Any, Optional

from langchain_core.tools import tool

from app.coaching.registry import get_all_skill_ids, get_skill
from app.coaching.schema import CoachingSkill
from app.db.supabase_client import get_supabase_client


def _skill_to_dict(skill: CoachingSkill) -> dict:
    """Convert a CoachingSkill dataclass to a serializable dict."""
    data = asdict(skill)
    if data.get("scoring") is None:
        data["scoring"] = {"type": "none"}
    if data.get("case_study") is None:
        data.pop("case_study", None)
    return data


@tool
def load_skill_definition(skill_id: str) -> dict:
    """Load the definition of a coaching skill from the skill registry.

    Returns the skill's metadata, rubric, prompts, and scoring criteria
    used to guide the coaching conversation. If the skill_id is not found,
    returns available skill IDs to help the caller pick a valid one.
    """
    skill = get_skill(skill_id)
    if skill is None:
        available = get_all_skill_ids()
        return {
            "skill_id": skill_id,
            "status": "not_found",
            "message": f"Skill '{skill_id}' not found in the registry.",
            "available_skills": available,
        }

    return {
        "skill_id": skill.id,
        "status": "loaded",
        "skill": _skill_to_dict(skill),
    }


def _score_ladder(rubric: dict, answers: dict[str, Any]) -> dict:
    """Apply ladder rubric: maps income to Financial Ladder level."""
    income_map = {
        "under_30k": "Survival",
        "30k_60k": "Status",
        "60k_100k": "Status",
        "100k_250k": "Freedom",
        "250k_plus": "Purpose",
    }
    income_answer = answers.get("current_income_range", "")
    level = income_map.get(income_answer, "Unknown")

    levels = rubric.get("levels", [])
    level_detail = next((l for l in levels if l["name"] == level), None)
    all_level_names = [l["name"] for l in levels]
    idx = all_level_names.index(level) if level in all_level_names else 0
    next_level = all_level_names[idx + 1] if idx < len(all_level_names) - 1 else None

    return {
        "type": "ladder",
        "current_level": level,
        "income_range": level_detail["range_label"] if level_detail else income_answer,
        "population_note": (
            f"{level_detail['population_pct']}% of people are at this level"
            if level_detail and level_detail.get("population_pct")
            else ""
        ),
        "next_level": next_level,
    }


def _score_scale(rubric: dict, answers: dict[str, Any]) -> dict:
    """Apply scale rubric: average 1-10 scores, interpret ranges."""
    dimensions = rubric.get("dimensions", [])
    scores: dict[str, float] = {}
    values: list[float] = []

    for dim in dimensions:
        raw = answers.get(dim)
        if raw is None:
            continue
        try:
            val = float(raw)
        except (ValueError, TypeError):
            continue
        scores[dim] = val
        values.append(val)

    if not values:
        return {"type": "scale", "overall_score": 0, "overall_pct": 0,
                "interpretation": "No scoreable answers", "dimension_scores": {}}

    avg = sum(values) / len(values)
    pct = round((avg / 10.0) * 100, 1)

    if pct <= 30:
        interp = "Fragile"
    elif pct <= 60:
        interp = "Emerging"
    elif pct <= 80:
        interp = "Strong"
    else:
        interp = "Resilient"

    return {
        "type": "scale",
        "overall_score": round(avg, 1),
        "overall_pct": pct,
        "interpretation": interp,
        "dimension_scores": scores,
    }


def _score_ratio(rubric: dict, answers: dict[str, Any]) -> dict:
    """Apply ratio rubric: compare actual % split to target ratio."""
    dimensions = rubric.get("dimensions", [])
    target_str = rubric.get("target_ratio", "")
    target_parts = [int(p) for p in target_str.split("/")] if target_str else []

    actual_values: list[float] = []
    for dim in dimensions:
        try:
            actual_values.append(float(answers.get(dim, 0)))
        except (ValueError, TypeError):
            actual_values.append(0)

    total = sum(actual_values) or 1
    actual_pcts = [round((v / total) * 100) for v in actual_values]

    total_deviation = 0.0
    deviations: list[dict] = []
    for i, dim in enumerate(dimensions):
        actual = actual_pcts[i] if i < len(actual_pcts) else 0
        target = target_parts[i] if i < len(target_parts) else 0
        dev = abs(actual - target)
        total_deviation += dev
        deviations.append({
            "dimension": dim, "actual_pct": actual,
            "target_pct": target, "deviation": dev,
        })

    alignment = max(0, round(100 - total_deviation))

    if alignment >= 80:
        interp = "Well-Aligned"
    elif alignment >= 50:
        interp = "Misaligned"
    else:
        interp = "Inverted"

    return {
        "type": "ratio",
        "target_ratio": target_str,
        "actual_ratio": "/".join(str(p) for p in actual_pcts),
        "alignment_score": alignment,
        "interpretation": interp,
        "deviations": deviations,
    }


@tool
def compute_assessment_score(skill_id: str, answers: dict) -> dict:
    """Compute an assessment score for a coaching skill based on user answers.

    Applies the skill's scoring rubric to the provided answers dict and
    returns a breakdown of scores per dimension plus an overall interpretation.
    The answers dict should map question IDs to the user's responses.
    """
    skill = get_skill(skill_id)
    if skill is None:
        return {
            "skill_id": skill_id,
            "status": "not_found",
            "message": f"Skill '{skill_id}' not found — cannot compute score.",
            "scores": {},
        }

    if skill.scoring is None:
        return {
            "skill_id": skill_id,
            "status": "no_rubric",
            "message": f"Skill '{skill.name}' is a reflective exercise with no scoring rubric.",
            "scores": {},
        }

    rubric_dict = asdict(skill.scoring)
    scorers = {
        "ladder": _score_ladder,
        "scale": _score_scale,
        "ratio": _score_ratio,
    }

    scorer = scorers.get(rubric_dict["type"])
    if scorer is None:
        return {
            "skill_id": skill_id,
            "status": "unknown_rubric",
            "message": f"Rubric type '{rubric_dict['type']}' not recognized.",
            "scores": {},
        }

    result = scorer(rubric_dict, answers)
    result["skill_id"] = skill_id
    result["skill_name"] = skill.name
    result["answers_received"] = len(answers)
    result["status"] = "scored"
    return result


@tool
def get_coaching_progress(
    user_id: str, program: Optional[str] = None
) -> dict:
    """Get the user's coaching progress across all programs or a specific one.

    Returns completed skills, current phase/week, and skill outputs
    (answers, scores, action items) from d2c_coaching_progress.
    """
    try:
        sb = get_supabase_client()
        query = (
            sb.table("d2c_coaching_progress")
            .select("*")
            .eq("user_id", user_id)
        )

        if program:
            query = query.eq("program", program)

        result = query.execute()

        if not result.data:
            return {
                "user_id": user_id,
                "program": program,
                "completed_skills": [],
                "current_phase": None,
                "current_week": None,
                "skill_outputs": {},
                "message": "No coaching progress found for this user.",
            }

        if program:
            return result.data[0]

        return {"user_id": user_id, "programs": result.data}
    except Exception as exc:
        return {"error": f"Failed to get coaching progress: {exc}"}
