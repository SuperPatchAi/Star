"""Scoring engine tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

import pytest

from app.coaching.parser.scoring import extract_scoring


def test_ladder_scoring_detection() -> None:
    """Ladder scoring detected from content with Financial Ladder."""
    content = """
    # Financial Ladder

    The Financial Ladder has four levels:

    | Level | Income Range | Population |
    |-------|--------------|------------|
    | Survival | $0 - $5,000 | 66% |
    | Status | $5,000 - $20,000 | 25% |
    | Freedom | $20,000 - $100,000 | 7% |
    | Purpose | $100,000+ | 2% |

    Based on your income, select your level.
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "ladder"
    assert "levels" in result
    assert len(result["levels"]) == 4
    names = [lv["name"] for lv in result["levels"]]
    assert "Survival" in names
    assert "Status" in names
    assert "Freedom" in names
    assert "Purpose" in names


def test_ladder_scoring_income_mapping() -> None:
    """Ladder levels map to income ranges."""
    content = """
    Financial Ladder assessment

    Survival: $0 - $5,000
    Status: $5,000 - $20,000
    Freedom: $20,000 - $100,000
    Purpose: $100,000+
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "ladder"
    for level in result["levels"]:
        if level["name"] == "Survival":
            assert "$0" in level["range_label"] or "5,000" in level["range_label"]
        if level["name"] == "Purpose":
            assert "100,000" in level["range_label"]


def test_scale_scoring_detection() -> None:
    """Scale scoring (1-10) detected from content with AVERAGE dimensions."""
    content = """
    Rate each dimension from 1/10 to 10/10.

    AVERAGE Trust in Self | 7
    AVERAGE Factor: Communication | 8
    AVERAGE Factor: Consistency | 5

    Scoring Guide:
    - 1-3: Low
    - 4-6: Medium
    - 7-10: High
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "scale"
    assert "dimensions" in result
    assert len(result["dimensions"]) >= 1
    assert "levels" in result
    assert len(result["levels"]) == 3


def test_scale_scoring_interpretation() -> None:
    """Scale scoring includes interpretation levels (Low/Medium/High)."""
    content = """
    Scale 1/10 to 10/10 for each factor.

    AVERAGE Trust Factor: Self | 6
    AVERAGE Trust Factor: Team | 8

    Interpretation

    Score 1-3: Low
    Score 4-6: Medium
    Score 7-10: High
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "scale"
    level_names = [lv["name"] for lv in result["levels"]]
    assert "Low" in level_names
    assert "Medium" in level_names
    assert "High" in level_names


def test_ratio_scoring_detection() -> None:
    """Ratio scoring detected from 80/15/5 talent distribution."""
    content = """
    Talent Density Model

    Target ratio: 80/15/5
    - 80% A-players
    - 15% B-players
    - 5% C-players

    Calculate your percentage for each category.
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "ratio"
    assert result["target_ratio"] == "80/15/5"


def test_ratio_scoring_percentage_calculation() -> None:
    """Ratio scoring requires 100% sum."""
    content = """
    Distribution: 70/20/10
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "ratio"
    assert result["target_ratio"] == "70/20/10"


def test_ratio_scoring_rejects_invalid_sum() -> None:
    """Ratio scoring rejects ratios that don't sum to 100."""
    content = """
    Invalid ratio: 80/10/5
    """
    result = extract_scoring(content)
    assert result is None


def test_extract_scoring_returns_none_for_plain_text() -> None:
    """extract_scoring returns None for content without scoring framework."""
    content = "This is just plain text with no scoring framework."
    result = extract_scoring(content)
    assert result is None


def test_extract_scoring_prefers_ladder_over_scale() -> None:
    """When both ladder and scale present, ladder is preferred."""
    content = """
    Financial Ladder assessment

    Survival: $0 - $5,000
    Status: $5,000 - $20,000
    Freedom: $20,000 - $100,000
    Purpose: $100,000+

    AVERAGE Trust | 7
    """
    result = extract_scoring(content)
    assert result is not None
    assert result["type"] == "ladder"
