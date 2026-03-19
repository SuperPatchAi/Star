"""Extract structured questions from worksheet markdown content."""

import re

_SCALE_PATTERN = re.compile(r"/10|Score\s*\(1[-–]10\)|Rate yourself|score\s*\(1[-–]10\)", re.IGNORECASE)
_CHECKBOX_PATTERN = re.compile(r"☐|- \[ \]")
_FILL_PATTERN = re.compile(r"_{3,}")
_TABLE_HEADER_PATTERN = re.compile(r"^\|.*\|.*\|", re.MULTILINE)
_TABLE_SEPARATOR = re.compile(r"^\|[-:| ]+\|$", re.MULTILINE)
_OPEN_ENDED_CUES = re.compile(
    r"\bWrite\b|\bDescribe\b|\bWhat would\b|\bExplain\b|\bWhy do you\b|\bHow do you\b",
    re.IGNORECASE,
)


def _extract_question_heading(line: str) -> str | None:
    """Return the question text if the line is a heading-style question (### Question N: ...)."""
    m = re.match(r"^###\s+(?:Question\s+\d+:\s*)?(.+)", line)
    if m:
        return m.group(1).strip()
    return None


def _is_table_row(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def _parse_table_rows(lines: list[str], start: int) -> tuple[list[list[str]], int]:
    """Parse consecutive markdown table rows starting from `start`. Returns (rows, end_index)."""
    rows: list[list[str]] = []
    i = start
    while i < len(lines) and _is_table_row(lines[i]):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if not re.match(r"^[-:| ]+$", lines[i].strip().strip("|")):
            rows.append(cells)
        i += 1
    return rows, i


def _detect_question_type(heading: str, block_lines: list[str]) -> str:
    """Determine question type from the heading and its associated content block."""
    block_text = "\n".join(block_lines)

    if _SCALE_PATTERN.search(block_text) or _SCALE_PATTERN.search(heading):
        return "scale"
    if _CHECKBOX_PATTERN.search(block_text):
        has_table = _TABLE_HEADER_PATTERN.search(block_text)
        # Checkbox inside a table with "Check One" → choice question
        if has_table and re.search(r"Check One", block_text, re.IGNORECASE):
            return "choice"
        return "checkbox"
    if _TABLE_HEADER_PATTERN.search(block_text):
        # Tables with empty cells to fill → table type
        if re.search(r"\|\s*\|", block_text):
            return "table"
        return "table"
    if _FILL_PATTERN.search(block_text) or _FILL_PATTERN.search(heading):
        return "fill_in"
    if _OPEN_ENDED_CUES.search(heading):
        return "open_ended"
    if "```" in block_text:
        return "open_ended"

    return "open_ended"


_HEADER_WORDS = {
    "range", "check one", "field", "attribute", "statement", "situation",
    "percentage", "option", "hours", "factor", "your answer", "score",
    "check", "evidence/notes", "quality", "do you have it?",
}


def _is_header_row(row: list[str]) -> bool:
    """Heuristic: a row is a header if all cells are short generic labels."""
    if not row:
        return False
    cleaned = [re.sub(r"\*\*", "", c).strip().lower() for c in row]
    return all(c in _HEADER_WORDS or len(c) <= 2 for c in cleaned if c)


def _extract_options_from_table(rows: list[list[str]], q_type: str) -> list[dict]:
    """Pull option values from table rows for choice/checkbox questions, skipping headers."""
    options: list[dict] = []
    for idx, row in enumerate(rows):
        if not row:
            continue
        if idx == 0 and _is_header_row(row):
            continue
        label = re.sub(r"\*\*", "", row[0]).strip()
        if not label:
            continue
        value = re.sub(r"[^\w\s$,+%-]", "", label).strip().lower().replace(" ", "_")[:60]
        if value:
            options.append({"value": value, "label": label})
    return options


def _collect_block(lines: list[str], start: int) -> list[str]:
    """Collect lines belonging to a question block (until next heading or '---')."""
    block: list[str] = []
    i = start
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("#") or line.strip() == "---":
            break
        block.append(line)
        i += 1
    return block


def _has_empty_cells(block: list[str]) -> bool:
    """Return True if the table has cells that are meant to be filled in (mostly empty)."""
    data_rows = [
        l for l in block
        if _is_table_row(l) and not re.match(r"^[-:| ]+$", l.strip().strip("|"))
    ]
    if len(data_rows) <= 1:
        return False
    empty_count = 0
    total_count = 0
    for row in data_rows[1:]:
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        for cell in cells[1:]:
            total_count += 1
            cleaned = re.sub(r"\*\*", "", cell).strip()
            if not cleaned or cleaned in ("$", "%", "/10"):
                empty_count += 1
    if total_count == 0:
        return False
    return empty_count / total_count > 0.4


def extract_questions(content: str) -> list[dict]:
    """Parse markdown content and return a list of question dicts."""
    lines = content.splitlines()
    questions: list[dict] = []
    q_counter = 0

    i = 0
    while i < len(lines):
        heading = _extract_question_heading(lines[i])
        if heading:
            i += 1
            block = _collect_block(lines, i)
            q_type = _detect_question_type(heading, block)
            q_counter += 1
            q_id = f"q{q_counter}"

            q: dict = {
                "id": q_id,
                "text": heading,
                "type": q_type,
            }

            if q_type in ("choice", "checkbox"):
                table_rows: list[list[str]] = []
                for j, bline in enumerate(block):
                    if _is_table_row(bline):
                        rows, _ = _parse_table_rows(block, j)
                        table_rows = rows
                        break
                opts = _extract_options_from_table(table_rows, q_type)
                if opts:
                    q["options"] = opts

            if q_type == "scale":
                q["scale_min"] = 1
                q["scale_max"] = 10

            if q_type == "table":
                row_count = sum(1 for bl in block if _is_table_row(bl) and not re.match(r"^[-:| ]+$", bl.strip().strip("|")))
                header_count = 1 if row_count > 0 else 0
                q["max_items"] = max(row_count - header_count, 0)

            questions.append(q)
            i += len(block)
        else:
            # Detect implicit questions from Part/section headings with content blocks
            stripped = lines[i].strip()
            if stripped.startswith("## Part") or (stripped.startswith("## ") and ":" in stripped):
                section_name = stripped.lstrip("# ").strip()
                i += 1
                block = _collect_block(lines, i)
                block_text = "\n".join(block)

                has_interactive = (
                    _CHECKBOX_PATTERN.search(block_text)
                    or _SCALE_PATTERN.search(block_text)
                    or _FILL_PATTERN.search(block_text)
                    or (
                        _TABLE_HEADER_PATTERN.search(block_text)
                        and _has_empty_cells(block)
                    )
                    or "```" in block_text
                )
                if not has_interactive:
                    i += len(block)
                    continue

                q_type = _detect_question_type(section_name, block)
                q_counter += 1
                q_id = f"q{q_counter}"

                q = {
                    "id": q_id,
                    "text": section_name,
                    "type": q_type,
                }

                if q_type in ("choice", "checkbox"):
                    table_rows = []
                    for j, bline in enumerate(block):
                        if _is_table_row(bline):
                            rows, _ = _parse_table_rows(block, j)
                            table_rows = rows
                            break
                    opts = _extract_options_from_table(table_rows, q_type)
                    if opts:
                        q["options"] = opts

                if q_type == "scale":
                    q["scale_min"] = 1
                    q["scale_max"] = 10

                if q_type == "table":
                    row_count = sum(
                        1
                        for bl in block
                        if _is_table_row(bl)
                        and not re.match(r"^[-:| ]+$", bl.strip().strip("|"))
                    )
                    header_count = 1 if row_count > 0 else 0
                    q["max_items"] = max(row_count - header_count, 0)

                questions.append(q)
                i += len(block)
            else:
                i += 1

    return questions
