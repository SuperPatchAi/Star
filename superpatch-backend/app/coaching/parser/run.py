"""CLI entry point: convert worksheet markdown files into YAML skill definitions.

Usage:
    python -m app.coaching.parser.run                       # all worksheets
    python -m app.coaching.parser.run --file path/to/ws.md  # single file
    python -m app.coaching.parser.run --worksheets-dir docs/worksheets
"""

import argparse
import sys
from pathlib import Path

import yaml

from app.coaching.parser.metadata import extract_metadata
from app.coaching.parser.questions import extract_questions
from app.coaching.parser.scoring import extract_scoring

DEFINITIONS_ROOT = Path(__file__).resolve().parent.parent / "definitions"

PHASE_DIRS = {
    1: "phase1",
    2: "phase2",
    3: "phase3",
    4: "phase4",
}


def _output_dir_for(meta: dict) -> Path:
    if meta["program"] == "global_leaders":
        return DEFINITIONS_ROOT / "global_leaders"
    return DEFINITIONS_ROOT / PHASE_DIRS.get(meta["phase"], "phase1")


def _build_skill_dict(filepath: Path) -> dict:
    content = filepath.read_text(encoding="utf-8")
    meta = extract_metadata(filepath)
    questions = extract_questions(content)
    scoring = extract_scoring(content)

    skill: dict = {
        "id": meta["id"],
        "name": meta["name"],
        "program": meta["program"],
        "phase": meta["phase"],
        "week": meta["week"],
        "frameworks": meta["frameworks"],
        "worksheet_path": meta["worksheet_path"],
        "prerequisites": [],
        "questions": questions,
        "actions": [],
    }

    if scoring:
        skill["scoring"] = scoring

    return skill


def process_file(filepath: Path) -> Path:
    """Parse a single worksheet and write its YAML definition. Returns output path."""
    skill = _build_skill_dict(filepath)
    out_dir = _output_dir_for(skill)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{skill['id']}.yaml"

    with open(out_path, "w", encoding="utf-8") as f:
        yaml.dump(skill, f, default_flow_style=False, sort_keys=False, allow_unicode=True, width=120)

    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert worksheet markdown to YAML skill definitions")
    parser.add_argument("--file", type=str, help="Path to a single worksheet markdown file")
    parser.add_argument(
        "--worksheets-dir",
        type=str,
        default=None,
        help="Directory containing worksheet markdown files (default: auto-detect)",
    )
    args = parser.parse_args()

    if args.file:
        fp = Path(args.file)
        if not fp.exists():
            print(f"File not found: {fp}", file=sys.stderr)
            sys.exit(1)
        out = process_file(fp)
        print(f"  [ok] {fp.name} -> {out}")
        return

    ws_dir: Path | None = None
    if args.worksheets_dir:
        ws_dir = Path(args.worksheets_dir)
    else:
        candidates = [
            Path("docs/worksheets"),
            Path("../docs/worksheets"),
            Path(__file__).resolve().parent.parent.parent.parent.parent / "docs" / "worksheets",
        ]
        for c in candidates:
            if c.is_dir():
                ws_dir = c
                break

    if ws_dir is None or not ws_dir.is_dir():
        print("Could not find worksheets directory. Use --worksheets-dir to specify.", file=sys.stderr)
        sys.exit(1)

    md_files = sorted(ws_dir.glob("*.md"))
    # Skip index files
    md_files = [f for f in md_files if not f.stem.startswith("00-")]

    if not md_files:
        print(f"No markdown files found in {ws_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {len(md_files)} worksheets from {ws_dir}\n")

    for fp in md_files:
        out = process_file(fp)
        print(f"  [ok] {fp.name} -> {out.relative_to(DEFINITIONS_ROOT)}")

    print(f"\nDone. {len(md_files)} skill definitions written to {DEFINITIONS_ROOT}")


if __name__ == "__main__":
    main()
