"""Extract scoring rubrics from worksheet markdown content."""

import re


_LADDER_NAMES = ["Survival", "Status", "Freedom", "Purpose"]
_LADDER_RANGES = {
    "Survival": "$0 - $5,000",
    "Status": "$5,000 - $20,000",
    "Freedom": "$20,000 - $100,000",
    "Purpose": "$100,000+",
}
_LADDER_PCTS = {
    "Survival": 66.0,
    "Status": 25.0,
    "Freedom": 7.0,
    "Purpose": 2.0,
}

_SCORE_RANGE_RE = re.compile(r"Score\s+(\d+)[-–](\d+)", re.IGNORECASE)
_RATIO_RE = re.compile(r"(\d{1,3})/(\d{1,3})/(\d{1,3})")
_AVERAGE_RE = re.compile(r"AVERAGE", re.IGNORECASE)


def _detect_ladder(content: str) -> dict | None:
    """Check if the worksheet contains the Financial Ladder scoring framework."""
    if not all(name.lower() in content.lower() for name in _LADDER_NAMES):
        return None

    # Verify it's the actual ladder framework (table with levels)
    if "Financial Ladder" not in content and "financial ladder" not in content.lower():
        return None

    levels = []
    for name in _LADDER_NAMES:
        levels.append({
            "name": name,
            "range_label": _LADDER_RANGES[name],
            "population_pct": _LADDER_PCTS[name],
        })

    return {
        "type": "ladder",
        "levels": levels,
    }


def _detect_scale(content: str) -> dict | None:
    """Check for 1-10 scale scoring with named dimensions (e.g., Trust Factor assessment)."""
    if "/10" not in content:
        return None

    dimensions: list[str] = []
    for line in content.splitlines():
        m = re.search(r"AVERAGE[:\s]*(?:\*\*)?([^*|]+?)(?:\*\*)?\s*\|", line, re.IGNORECASE)
        if m:
            dim_text = m.group(1).strip()
            dim_text = re.sub(r"^(Trust in |Factor:\s*)", "", dim_text).strip()
            if dim_text and dim_text not in dimensions:
                dimensions.append(dim_text)

    if not dimensions:
        return None

    # Build interpretation levels from scoring guide if present
    levels: list[dict] = []
    guide_header = re.search(r"Scoring Guide|Interpretation", content, re.IGNORECASE)
    if guide_header:
        levels = [
            {"name": "Low", "range_label": "1-3"},
            {"name": "Medium", "range_label": "4-6"},
            {"name": "High", "range_label": "7-10"},
        ]
    else:
        levels = [
            {"name": "Low", "range_label": "1-3"},
            {"name": "Medium", "range_label": "4-6"},
            {"name": "High", "range_label": "7-10"},
        ]

    return {
        "type": "scale",
        "dimensions": dimensions,
        "levels": levels,
    }


def _detect_ratio(content: str) -> dict | None:
    """Check for ratio-based scoring (e.g. 80/15/5 talent distribution)."""
    m = _RATIO_RE.search(content)
    if not m:
        return None

    ratio_str = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    parts = [int(m.group(1)), int(m.group(2)), int(m.group(3))]
    if sum(parts) != 100:
        return None

    return {
        "type": "ratio",
        "target_ratio": ratio_str,
    }


def extract_scoring(content: str) -> dict | None:
    """Detect and return the primary scoring rubric in the worksheet, or None."""
    # Try in order of specificity
    ladder = _detect_ladder(content)
    if ladder:
        return ladder

    scale = _detect_scale(content)
    if scale:
        return scale

    ratio = _detect_ratio(content)
    if ratio:
        return ratio

    return None
