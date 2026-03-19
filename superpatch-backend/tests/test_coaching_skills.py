"""Coaching skill tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

import pytest

from app.coaching.registry import (
    check_prerequisites,
    get_next_skill,
    get_skill,
    list_skills,
    reload,
)
from app.coaching.schema import (
    CoachingSkill,
    Question,
    QuestionOption,
    ScoringLevel,
    ScoringRubric,
)


def test_coaching_skill_schema_creation() -> None:
    """CoachingSkill schema can be created with required fields."""
    skill = CoachingSkill(
        id="test_skill",
        name="Test Skill",
        program="100m_blueprint",
        phase=1,
        week=1,
    )
    assert skill.id == "test_skill"
    assert skill.name == "Test Skill"
    assert skill.program == "100m_blueprint"
    assert skill.phase == 1
    assert skill.week == 1
    assert skill.prerequisites == []
    assert skill.questions == []


def test_coaching_skill_with_scoring() -> None:
    """CoachingSkill can include ScoringRubric."""
    levels = [
        ScoringLevel(name="Low", range_label="1-3", population_pct=50.0),
        ScoringLevel(name="High", range_label="7-10", population_pct=10.0),
    ]
    rubric = ScoringRubric(type="scale", levels=levels, dimensions=["Trust"])
    skill = CoachingSkill(
        id="trust_assessment",
        name="Trust Factor",
        program="100m_blueprint",
        phase=1,
        week=2,
        scoring=rubric,
    )
    assert skill.scoring is not None
    assert skill.scoring.type == "scale"
    assert len(skill.scoring.levels) == 2


def test_coaching_skill_with_questions() -> None:
    """CoachingSkill can include Question list."""
    options = [QuestionOption(value="a", label="Option A")]
    q = Question(id="q1", text="Test?", type="choice", options=options)
    skill = CoachingSkill(
        id="test_skill",
        name="Test",
        program="100m_blueprint",
        phase=1,
        week=1,
        questions=[q],
    )
    assert len(skill.questions) == 1
    assert skill.questions[0].id == "q1"
    assert skill.questions[0].options[0].value == "a"


def test_registry_loads_skills_from_yaml() -> None:
    """Registry loads skills from YAML definitions."""
    reload()
    skills = list_skills()
    assert len(skills) > 0
    ids = [s.id for s in skills]
    assert "financial_ladder_assessment" in ids


def test_get_skill_returns_correct_skill() -> None:
    """get_skill returns skill by id."""
    skill = get_skill("financial_ladder_assessment")
    assert skill is not None
    assert skill.id == "financial_ladder_assessment"
    assert skill.name == "Financial Ladder Self-Assessment"
    assert "Financial Ladder" in skill.frameworks


def test_get_skill_returns_none_for_unknown() -> None:
    """get_skill returns None for unknown id."""
    skill = get_skill("nonexistent_skill_xyz")
    assert skill is None


def test_check_prerequisites_met() -> None:
    """check_prerequisites returns (True, []) when all met."""
    met, missing = check_prerequisites(
        "financial_ladder_assessment",
        completed_skills=[],
    )
    assert met is True
    assert missing == []


def test_check_prerequisites_not_met() -> None:
    """check_prerequisites returns (False, missing) when some missing."""
    skill_with_prereqs = get_skill("trust_factor_assessment")
    if skill_with_prereqs is None or not skill_with_prereqs.prerequisites:
        skill_with_prereqs = get_skill("platform_checklist")
    if skill_with_prereqs is None or not skill_with_prereqs.prerequisites:
        pytest.skip("No skill with prerequisites found in registry")

    met, missing = check_prerequisites(
        skill_with_prereqs.id,
        completed_skills=[],
    )
    assert met is False
    assert len(missing) > 0


def test_check_prerequisites_unknown_skill() -> None:
    """check_prerequisites returns (False, [skill_id]) for unknown skill."""
    met, missing = check_prerequisites("unknown_skill_xyz", completed_skills=[])
    assert met is False
    assert missing == ["unknown_skill_xyz"]


def test_get_next_skill_returns_first_when_none_completed() -> None:
    """get_next_skill returns first skill when no skills completed."""
    skill = get_next_skill("100m_blueprint", completed_skills=[])
    assert skill is not None
    assert skill.program == "100m_blueprint"
    assert skill.prerequisites == []


def test_get_next_skill_returns_none_when_all_completed() -> None:
    """get_next_skill returns None when all skills completed."""
    all_ids = [s.id for s in list_skills(program="100m_blueprint")]
    skill = get_next_skill("100m_blueprint", completed_skills=all_ids)
    assert skill is None


def test_get_next_skill_skips_completed() -> None:
    """get_next_skill skips completed skills and returns next with met prereqs."""
    first = get_next_skill("100m_blueprint", completed_skills=[])
    if first is None:
        pytest.skip("No skills in 100m_blueprint")
    second = get_next_skill("100m_blueprint", completed_skills=[first.id])
    if second is not None:
        assert second.id != first.id
