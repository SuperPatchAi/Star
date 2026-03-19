"""Extract metadata (id, name, program, phase, week, frameworks) from worksheet markdown files."""

import re
from pathlib import Path

KNOWN_FRAMEWORKS = [
    "Financial Ladder",
    "Cups of Commitment",
    "3 Trust Factors",
    "Trust Factors",
    "Amygdala Filter",
    "10-Year Product Roadmap",
    "Platform vs. Product",
    "Generational Wealth Mindset",
    "Validation Survey",
    "A/B Decision Audit",
    "Product Demo Framework",
    "Offer Stack",
    "Pricing Psychology",
    "Calendar Audit",
    "Daily Ritual",
    "First 48 Hours",
    "Talent Density",
    "A-Player Scorecard",
    "Inventory Moat",
    "Anti-Fragility",
    "LTV Audit",
    "CapEx Model",
    "Re-Engagement",
    "Expansion Readiness",
    "Entry Mode Matrix",
    "CEO Log",
    "Transformation Summary",
    "Accountability Contract",
]

_WEEK_RE = re.compile(r"week-(\d+)")
_GL_RE = re.compile(r"gl-(\d+)")


def _derive_id(filename: str) -> str:
    """Convert filename to a clean skill id.

    'week-01a-financial-ladder-assessment' → 'financial_ladder_assessment'
    'gl-03-customer-acquisition-plan'     → 'gl_customer_acquisition_plan'
    """
    stem = Path(filename).stem
    # Strip week/gl prefix with number and optional letter suffix
    cleaned = re.sub(r"^(week-\d+[a-z]?|gl-\d+)-", "", stem)
    if stem.startswith("gl-"):
        cleaned = "gl_" + cleaned
    return cleaned.replace("-", "_")


def _derive_program(filename: str) -> str:
    stem = Path(filename).stem
    if stem.startswith("gl-"):
        return "global_leaders"
    return "100m_blueprint"


def _derive_week(filename: str) -> int:
    stem = Path(filename).stem
    m = _WEEK_RE.search(stem) or _GL_RE.search(stem)
    if m:
        return int(m.group(1))
    return 0


def _derive_phase(week: int) -> int:
    if week <= 3:
        return 1
    if week <= 6:
        return 2
    if week <= 9:
        return 3
    return 4


def _extract_name(content: str) -> str:
    """Pull the first H1 heading as the skill name."""
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("##"):
            return stripped.lstrip("# ").strip()
    return "Untitled"


def _extract_frameworks(content: str) -> list[str]:
    found: list[str] = []
    content_lower = content.lower()
    for fw in KNOWN_FRAMEWORKS:
        if fw.lower() in content_lower and fw not in found:
            found.append(fw)
    return found


def extract_metadata(filepath: Path) -> dict:
    """Read a worksheet markdown file and return extracted metadata."""
    content = filepath.read_text(encoding="utf-8")
    filename = filepath.name
    week = _derive_week(filename)
    return {
        "id": _derive_id(filename),
        "name": _extract_name(content),
        "program": _derive_program(filename),
        "phase": _derive_phase(week),
        "week": week,
        "frameworks": _extract_frameworks(content),
        "worksheet_path": str(filepath),
    }
