"""Lazy-loading registry for coaching skill definitions stored as YAML."""

from pathlib import Path
from typing import Optional

import yaml

from app.coaching.schema import (
    CaseStudy,
    CoachingSkill,
    Question,
    QuestionOption,
    ScoringLevel,
    ScoringRubric,
)

DEFINITIONS_DIR = Path(__file__).resolve().parent / "definitions"

_cache: dict[str, CoachingSkill] = {}
_loaded = False


def _hydrate_question(raw: dict) -> Question:
    options = [QuestionOption(value=o["value"], label=o["label"]) for o in raw.get("options", [])]
    return Question(
        id=raw["id"],
        text=raw["text"],
        type=raw["type"],
        options=options,
        max_items=raw.get("max_items"),
        scale_min=raw.get("scale_min", 1),
        scale_max=raw.get("scale_max", 10),
    )


def _hydrate_scoring(raw: dict) -> ScoringRubric:
    levels = [
        ScoringLevel(
            name=lv["name"],
            range_label=lv["range_label"],
            population_pct=lv.get("population_pct"),
        )
        for lv in raw.get("levels", [])
    ]
    return ScoringRubric(
        type=raw["type"],
        levels=levels,
        dimensions=raw.get("dimensions", []),
        target_ratio=raw.get("target_ratio"),
    )


def _hydrate_case_study(raw: dict) -> CaseStudy:
    return CaseStudy(title=raw["title"], content=raw["content"])


def _hydrate_skill(raw: dict) -> CoachingSkill:
    questions = [_hydrate_question(q) for q in raw.get("questions", [])]
    scoring = _hydrate_scoring(raw["scoring"]) if raw.get("scoring") else None
    case_study = _hydrate_case_study(raw["case_study"]) if raw.get("case_study") else None

    return CoachingSkill(
        id=raw["id"],
        name=raw["name"],
        program=raw.get("program", "100m_blueprint"),
        phase=raw.get("phase", 1),
        week=raw.get("week", 0),
        frameworks=raw.get("frameworks", []),
        worksheet_path=raw.get("worksheet_path", ""),
        prerequisites=raw.get("prerequisites", []),
        questions=questions,
        scoring=scoring,
        case_study=case_study,
        actions=raw.get("actions", []),
    )


def _load_all() -> None:
    global _loaded
    if _loaded:
        return
    _cache.clear()

    if not DEFINITIONS_DIR.exists():
        _loaded = True
        return

    for yaml_file in sorted(DEFINITIONS_DIR.rglob("*.yaml")):
        with open(yaml_file, encoding="utf-8") as f:
            raw = yaml.safe_load(f)
        if raw and "id" in raw:
            skill = _hydrate_skill(raw)
            _cache[skill.id] = skill

    _loaded = True


def reload() -> None:
    """Force a full reload of all definitions (useful after parser run)."""
    global _loaded
    _loaded = False
    _load_all()


def get_skill(skill_id: str) -> Optional[CoachingSkill]:
    _load_all()
    return _cache.get(skill_id)


def list_skills(
    program: Optional[str] = None,
    phase: Optional[int] = None,
) -> list[CoachingSkill]:
    _load_all()
    results = list(_cache.values())
    if program is not None:
        results = [s for s in results if s.program == program]
    if phase is not None:
        results = [s for s in results if s.phase == phase]
    return sorted(results, key=lambda s: (s.phase, s.week, s.id))


def get_prerequisites(skill_id: str) -> list[str]:
    skill = get_skill(skill_id)
    if skill is None:
        return []
    return list(skill.prerequisites)


def get_all_skill_ids() -> list[str]:
    _load_all()
    return list(_cache.keys())


def get_next_skill(
    program: str, completed_skills: list[str]
) -> Optional[CoachingSkill]:
    """Return the next recommended skill whose prerequisites are all satisfied."""
    for skill in list_skills(program=program):
        if skill.id in completed_skills:
            continue
        if all(p in completed_skills for p in skill.prerequisites):
            return skill
    return None


def check_prerequisites(
    skill_id: str, completed_skills: list[str]
) -> tuple[bool, list[str]]:
    """Check if prerequisites are met. Returns (met, missing_ids)."""
    skill = get_skill(skill_id)
    if skill is None:
        return False, [skill_id]
    missing = [p for p in skill.prerequisites if p not in completed_skills]
    return len(missing) == 0, missing


def get_skills_for_program(program: str) -> list[CoachingSkill]:
    """Alias for list_skills(program=program)."""
    return list_skills(program=program)


def get_phase_skills(program: str, phase: int) -> list[CoachingSkill]:
    """Get all skills for a specific program and phase."""
    return list_skills(program=program, phase=phase)
