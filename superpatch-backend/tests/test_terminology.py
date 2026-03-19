"""Terminology enforcement tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

from app.agent.prompts.terminology import build_terminology_prompt, check_terminology


def test_check_terminology_replaces_banned_terms() -> None:
    """check_terminology replaces forbidden phrases with safe alternatives."""
    text = "This product will cure your condition."
    result = check_terminology(text)
    assert "cure" not in result.lower()
    assert "support" in result.lower() or "wellness" in result.lower()


def test_check_terminology_replaces_distributor() -> None:
    """check_terminology replaces 'distributor' with 'representative'."""
    text = "Contact your distributor for more info."
    result = check_terminology(text)
    assert "distributor" not in result.lower()
    assert "representative" in result.lower()


def test_check_terminology_replaces_free_trial() -> None:
    """check_terminology replaces 'free trial' with 'free sample'."""
    text = "Sign up for a free trial today."
    result = check_terminology(text)
    assert "free trial" not in result.lower()
    assert "free sample" in result.lower()


def test_check_terminology_preserves_clean_text() -> None:
    """check_terminology preserves text with no violations."""
    text = "Welcome to Super Patch. Our representatives are here to help."
    result = check_terminology(text)
    assert result == text


def test_check_terminology_case_aware() -> None:
    """check_terminology preserves capitalisation pattern when replacing."""
    text = "CURE and cure are both replaced."
    result = check_terminology(text)
    assert "cure" not in result.lower()
    assert "CURE" not in result


def test_build_terminology_prompt_returns_non_empty() -> None:
    """build_terminology_prompt returns non-empty string."""
    result = build_terminology_prompt()
    assert isinstance(result, str)
    assert len(result) > 0


def test_build_terminology_prompt_includes_superpatch_rules() -> None:
    """build_terminology_prompt includes SuperPatch terminology rules."""
    result = build_terminology_prompt()
    assert "SuperPatch" in result
    assert "sample" in result or "trial" in result
    assert "representative" in result or "distributor" in result


def test_build_terminology_prompt_includes_forbidden_phrases() -> None:
    """build_terminology_prompt includes forbidden phrases section."""
    result = build_terminology_prompt()
    assert "Forbidden" in result or "forbidden" in result
    assert "cure" in result.lower()


def test_build_terminology_prompt_with_product_ids() -> None:
    """build_terminology_prompt with product_ids includes product-specific section."""
    result = build_terminology_prompt(product_ids=["FOCUS"])
    assert "FOCUS" in result or "Focus" in result
    assert len(result) > 0
