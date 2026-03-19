"""Terminology enforcement for SuperPatch brand compliance.

Loads patch_lexicon.config.json and superpatch_brand_voice_compliance_config.json
at import time and exposes two public functions:

- build_terminology_prompt()  — returns a prompt section for LLM system messages
- check_terminology()         — deterministic post-processing text replacement
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_MONOREPO_ROOT = _BACKEND_ROOT.parent


def _find_config(filename: str) -> Path:
    """Locate a config file in the monorepo root or the backend root (Render)."""
    for base in (_MONOREPO_ROOT, _BACKEND_ROOT):
        candidate = base / filename
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"{filename} not found in {_MONOREPO_ROOT} or {_BACKEND_ROOT}"
    )


_lexicon_config: dict = json.loads(
    _find_config("patch_lexicon.config.json").read_text()
)
_brand_voice_config: dict = json.loads(
    _find_config("superpatch_brand_voice_compliance_config.json").read_text()
)

# ---------------------------------------------------------------------------
# Internal: build replacement data from the loaded configs
# ---------------------------------------------------------------------------

_FORBIDDEN_PHRASES: list[str] = _lexicon_config["global"]["forbiddenPhrases"]

# Map each forbidden phrase to a compliance-safe alternative.  The keys are
# read from the config; fallback is "wellness support" for any new phrase
# added to the config that doesn't yet have a specific override.
_SAFE_ALTERNATIVES: dict[str, str] = {}
_PERMITTED_FOCUS: list[str] = (
    _brand_voice_config
    .get("legal_compliance", {})
    .get("medical_claims", {})
    .get("permitted_focus", [])
)
_DEFAULT_SAFE_TERM = _PERMITTED_FOCUS[0].lower() if _PERMITTED_FOCUS else "support"

_OVERRIDE_MAP: dict[str, str] = {
    "cure": _DEFAULT_SAFE_TERM,
    "treats disease": f"{_DEFAULT_SAFE_TERM}s wellness",
    "treat disease": f"{_DEFAULT_SAFE_TERM} wellness",
    "diagnose": "assess",
    "heal injury": "aid recovery",
    "clinical cure": "wellness benefit",
    "guaranteed results": "potential benefits",
    "permanent cure": f"ongoing {_DEFAULT_SAFE_TERM}",
}

for phrase in _FORBIDDEN_PHRASES:
    _SAFE_ALTERNATIVES[phrase.lower()] = _OVERRIDE_MAP.get(
        phrase.lower(), _DEFAULT_SAFE_TERM
    )

# General SuperPatch brand terminology — these are organisational conventions
# that apply regardless of product.
_BRAND_TERM_REPLACEMENTS: dict[str, str] = {
    "distributor": "representative",
    "distributors": "representatives",
    "free trial": "free sample",
    "free trials": "free samples",
}

# Merge into a single replacement map
_ALL_REPLACEMENTS: dict[str, str] = {**_SAFE_ALTERNATIVES, **_BRAND_TERM_REPLACEMENTS}


def _case_aware_replacement(match: re.Match, replacement: str) -> str:
    """Return *replacement* with the same capitalisation pattern as *match*."""
    original = match.group()
    if original.isupper():
        return replacement.upper()
    if original[0].isupper():
        return replacement[0].upper() + replacement[1:]
    return replacement


# Pre-compile patterns sorted longest-first so multi-word phrases match
# before their single-word substrings.
_SORTED_PATTERNS: list[tuple[re.Pattern[str], str]] = sorted(
    [
        (re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE), repl)
        for term, repl in _ALL_REPLACEMENTS.items()
    ],
    key=lambda pair: len(pair[0].pattern),
    reverse=True,
)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_terminology_prompt(product_ids: list[str] | None = None) -> str:
    """Build a terminology-enforcement section for injection into system prompts.

    When *product_ids* is supplied, product-specific preferred / exclusive /
    discouraged term lists are included.
    """
    sections: list[str] = []

    # -- general terminology rules ------------------------------------------
    sections.append("## SuperPatch Terminology Rules")
    sections.append("")
    sections.append("Always use these SuperPatch-preferred terms:")
    sections.append('- Say "sample" instead of "trial"')
    sections.append('- Say "prospect" instead of "lead" (when referring to a potential customer)')
    sections.append('- Say "representative" instead of "distributor"')
    sections.append('- Use full product names (e.g. "Focus Super Patch"), never shorthand')
    sections.append("")

    # -- brand voice --------------------------------------------------------
    voice = _brand_voice_config.get("voice_tone_personality", {})
    voice_attrs = voice.get("voice_attributes", [])
    tone_attrs = voice.get("tone_attributes", [])
    prohibited_tones = voice.get("prohibited_tones", [])

    sections.append("## Brand Voice")
    if voice_attrs:
        sections.append(f"Voice: {', '.join(voice_attrs)}")
    if tone_attrs:
        sections.append(f"Tone: {', '.join(tone_attrs)}")
    if prohibited_tones:
        sections.append(f"Prohibited tones: {', '.join(prohibited_tones)}")
    sections.append("")

    # -- forbidden phrases --------------------------------------------------
    sections.append("## Forbidden Phrases (Never Use)")
    for phrase in _FORBIDDEN_PHRASES:
        sections.append(f'- "{phrase}"')
    sections.append("")

    # -- shared safe terms --------------------------------------------------
    shared = _lexicon_config.get("global", {}).get("sharedSafeTerms", [])
    if shared:
        sections.append("## Approved Global Terms (Safe for All Products)")
        for term in shared:
            sections.append(f"- {term}")
        sections.append("")

    # -- product-specific rules ---------------------------------------------
    if product_ids:
        patch_lexicon = _lexicon_config.get("patchLexicon", {})
        product_sections: list[str] = []
        for pid in product_ids:
            key = pid.upper()
            rules = patch_lexicon.get(key)
            if rules is None:
                continue
            lines = [f"### {key}"]
            preferred = rules.get("preferredTerms", [])
            exclusive = rules.get("exclusiveTerms", [])
            discouraged = rules.get("discouragedTerms", [])
            if preferred:
                lines.append(f"Preferred: {', '.join(preferred)}")
            if exclusive:
                lines.append(
                    f"Exclusive (only for this product): {', '.join(exclusive)}"
                )
            if discouraged:
                lines.append(f"Discouraged (avoid): {', '.join(discouraged)}")
            product_sections.append("\n".join(lines))

        if product_sections:
            sections.append("## Product-Specific Terminology")
            sections.append("\n\n".join(product_sections))
            sections.append("")

    # -- medical claims compliance ------------------------------------------
    medical = (
        _brand_voice_config
        .get("legal_compliance", {})
        .get("medical_claims", {})
    )
    prohibited_claims = medical.get("prohibited", [])
    permitted_focus = medical.get("permitted_focus", [])

    if prohibited_claims or permitted_focus:
        sections.append("## Medical Claims Compliance")
        if prohibited_claims:
            sections.append("Never make these claims:")
            for claim in prohibited_claims:
                sections.append(f"- {claim}")
        if permitted_focus:
            sections.append("Instead, focus language on:")
            for focus in permitted_focus:
                sections.append(f"- {focus}")
        sections.append("")

    return "\n".join(sections)


def check_terminology(text: str) -> str:
    """Scan *text* for banned or discouraged terms and return corrected text.

    Performs case-insensitive, word-boundary-aware replacements using the
    compiled rules from both config files.  Returns the original string
    unchanged when no violations are found.
    """
    result = text
    for pattern, replacement in _SORTED_PATTERNS:
        result = pattern.sub(
            lambda m, r=replacement: _case_aware_replacement(m, r),
            result,
        )
    return result
