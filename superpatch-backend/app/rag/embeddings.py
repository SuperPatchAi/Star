"""CLI to embed SuperPatch sales and coaching content into the star_embeddings table.

Usage:
    python -m app.rag.embeddings              # embed all content
    python -m app.rag.embeddings --sales-only  # roadmap specs only
    python -m app.rag.embeddings --coaching-only  # worksheets + docs only

Requires env vars: GOOGLE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Table schema (create in Supabase SQL editor before running):

    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS star_embeddings (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        domain      text NOT NULL,            -- 'sales' | 'coaching'
        content_type text NOT NULL,           -- opening, discovery, objection_handling, closing, followup, product_info, presentation, worksheet_question, framework, scoring_rubric, case_study
        source_id   text NOT NULL,            -- product id (e.g. 'Freedom') or worksheet stem (e.g. 'week-01a-financial-ladder-assessment')
        section_key text,                     -- original JSON section key or markdown header
        content     text NOT NULL,            -- the chunk text
        embedding   vector(768) NOT NULL,     -- text-embedding-004 produces 768-dim vectors
        metadata    jsonb DEFAULT '{}'::jsonb,
        created_at  timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_star_embeddings_domain ON star_embeddings (domain);
    CREATE INDEX IF NOT EXISTS idx_star_embeddings_source ON star_embeddings (source_id);
    CREATE INDEX IF NOT EXISTS idx_star_embeddings_type ON star_embeddings (content_type);
    CREATE INDEX IF NOT EXISTS idx_star_embeddings_vec ON star_embeddings
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.db.supabase_client import get_supabase_client

EMBEDDING_MODEL = "models/gemini-embedding-001"
BATCH_SIZE = 100

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_PROJECT_ROOT = _BACKEND_ROOT.parent

ROADMAP_DIR = _PROJECT_ROOT / "src" / "data" / "roadmap-specs-v2"
WORKSHEETS_DIR = _PROJECT_ROOT / "docs" / "worksheets"
CURRICULUM_MAP_PATH = _PROJECT_ROOT / "docs" / "curriculum_map.md"
EBOOK_PATH = _PROJECT_ROOT / "docs" / "ebook_extraction.md"

SECTION_MAP: dict[str, str] = {
    "1_customer_profile": "product_info",
    "2_opening_approaches": "opening",
    "3_discovery_questions": "discovery",
    "4_presentation": "presentation",
    "5_objection_handling": "objection_handling",
    "6_closing": "closing",
    "7_followup": "followup",
}

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _extract_product_id(filename: str) -> str:
    """'Freedom_Enhanced_Spec.json' → 'Freedom', 'Kick It_Enhanced_Spec.json' → 'Kick_It'."""
    return filename.replace("_Enhanced_Spec.json", "").replace(" ", "_")


# ---------------------------------------------------------------------------
# Section formatters — turn structured JSON sections into readable text
# ---------------------------------------------------------------------------


def _format_approaches(approaches: list[dict]) -> str:
    parts: list[str] = []
    for a in approaches:
        parts.append(f"{a['type']} ({a.get('context', '')}):\n\"{a['script']}\"")
    return "\n\n".join(parts)


def _format_questions(questions: list[dict]) -> str:
    return "\n".join(f"{q['type']}: {q['question']}" for q in questions)


def _format_presentation(content: dict) -> str:
    blocks: list[str] = []
    for key in ("problem", "agitate", "solve"):
        if key in content:
            blocks.append(f"{key.upper()}:\n{content[key]}")
    if content.get("key_benefits"):
        blocks.append(f"Key Benefits: {', '.join(content['key_benefits'])}")
    if content.get("differentiator"):
        blocks.append(f"Differentiator: {content['differentiator']}")
    return "\n\n".join(blocks)


def _format_objections(objections: list[dict]) -> str:
    parts: list[str] = []
    for o in objections:
        parts.append(
            f"Objection: {o['objection']}\n"
            f"Trigger: {o['trigger']}\n"
            f"Response: \"{o['response']}\"\n"
            f"Psychology: {o['psychology']}"
        )
    return "\n\n".join(parts)


def _format_closing(techniques: list[dict]) -> str:
    parts: list[str] = []
    for t in techniques:
        parts.append(
            f"{t['name']} Close:\n"
            f"\"{t['script']}\"\n"
            f"When to use: {t['when']}"
        )
    return "\n\n".join(parts)


def _format_followup(sequence: list[dict]) -> str:
    parts: list[str] = []
    for s in sequence:
        parts.append(
            f"{s['day']} — {s['action']} ({s.get('channel', '')}):\n"
            f"\"{s['template']}\""
        )
    return "\n\n".join(parts)


def _format_customer_profile(content: dict) -> str:
    lines: list[str] = []
    for key, values in content.items():
        if values:
            lines.append(f"{key.replace('_', ' ').title()}:")
            for v in values:
                lines.append(f"  - {v}")
    return "\n".join(lines)


def _section_to_text(section_key: str, section_data: dict, product: str) -> str:
    """Convert a roadmap JSON section into chunking-ready plain text."""
    title = section_data.get("title", section_key)
    header = f"{title} — {product}\n\n"
    content_type = SECTION_MAP.get(section_key, section_key)

    formatters: dict[str, tuple[str, callable]] = {
        "opening": ("approaches", _format_approaches),
        "discovery": ("questions", _format_questions),
        "presentation": ("content", _format_presentation),
        "objection_handling": ("objections", _format_objections),
        "closing": ("techniques", _format_closing),
        "followup": ("sequence", _format_followup),
        "product_info": ("content", _format_customer_profile),
    }

    if content_type in formatters:
        data_key, formatter = formatters[content_type]
        if data_key in section_data:
            return header + formatter(section_data[data_key])

    return header + json.dumps(section_data, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------


def _clear_source(client, source_id: str, domain: str) -> None:
    """Delete all existing embeddings for a given source so re-runs are idempotent."""
    client.table("star_embeddings").delete().eq(
        "source_id", source_id
    ).eq("domain", domain).execute()


def _batch_insert(client, records: list[dict]) -> None:
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        client.table("star_embeddings").insert(batch).execute()


# ---------------------------------------------------------------------------
# Sales content embedding (roadmap-specs-v2 JSONs)
# ---------------------------------------------------------------------------


def _embed_sales_content(embedder: GoogleGenerativeAIEmbeddings, client) -> int:
    total_chunks = 0
    json_files = sorted(ROADMAP_DIR.glob("*.json"))

    if not json_files:
        print(f"  No JSON files found in {ROADMAP_DIR}")
        return 0

    for json_path in json_files:
        product_id = _extract_product_id(json_path.name)
        print(f"  Embedding {product_id}...", end=" ", flush=True)

        _clear_source(client, product_id, "sales")

        with open(json_path, encoding="utf-8") as f:
            spec = json.load(f)

        meta_block = spec.get("metadata", {})
        sections = spec.get("sections", {})
        records: list[dict] = []

        for section_key, section_data in sections.items():
            content_type = SECTION_MAP.get(section_key, section_key)
            text = _section_to_text(
                section_key, section_data,
                meta_block.get("product", product_id),
            )
            chunks = _splitter.split_text(text)

            vectors = embedder.embed_documents(chunks)

            for chunk, vector in zip(chunks, vectors):
                records.append({
                    "domain": "sales",
                    "content_type": content_type,
                    "source_id": product_id,
                    "section_key": section_key,
                    "content": chunk,
                    "embedding": vector,
                    "metadata": {
                        "product": meta_block.get("product"),
                        "category": meta_block.get("category"),
                        "tagline": meta_block.get("tagline"),
                    },
                })

        _batch_insert(client, records)
        print(f"{len(records)} chunks")
        total_chunks += len(records)

    return total_chunks


# ---------------------------------------------------------------------------
# Coaching / markdown content embedding
# ---------------------------------------------------------------------------


_MD_HEADING_RE = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)


def _classify_md_section(header: str) -> str:
    """Classify a markdown section header into a content_type."""
    h = header.lower()
    if any(kw in h for kw in ("question", "discussion", "prompt", "hot seat")):
        return "worksheet_question"
    if any(kw in h for kw in ("score", "scoring", "rubric", "assessment", "audit")):
        return "scoring_rubric"
    if any(kw in h for kw in ("case study", "journey", "example")):
        return "case_study"
    return "framework"


def _split_markdown_sections(text: str) -> list[tuple[str, str]]:
    """Split markdown into (header, body) pairs on ## / ### headings."""
    sections: list[tuple[str, str]] = []
    current_header = "Introduction"
    current_lines: list[str] = []

    for line in text.splitlines():
        match = _MD_HEADING_RE.match(line)
        if match:
            body = "\n".join(current_lines).strip()
            if body:
                sections.append((current_header, body))
            current_header = match.group(2).strip()
            current_lines = []
        else:
            current_lines.append(line)

    body = "\n".join(current_lines).strip()
    if body:
        sections.append((current_header, body))

    return sections


def _embed_md_file(
    embedder: GoogleGenerativeAIEmbeddings,
    client,
    path: Path,
    source_id: str,
    domain: str = "coaching",
) -> int:
    """Embed a single markdown file into star_embeddings, returning chunk count."""
    print(f"  Embedding {source_id}...", end=" ", flush=True)
    _clear_source(client, source_id, domain)

    text = path.read_text(encoding="utf-8")
    sections = _split_markdown_sections(text)
    records: list[dict] = []

    for header, body in sections:
        content_type = _classify_md_section(header)
        full_text = f"{header}\n\n{body}"
        chunks = _splitter.split_text(full_text)

        if not chunks:
            continue

        vectors = embedder.embed_documents(chunks)

        for chunk, vector in zip(chunks, vectors):
            records.append({
                "domain": domain,
                "content_type": content_type,
                "source_id": source_id,
                "section_key": header,
                "content": chunk,
                "embedding": vector,
                "metadata": {"file": path.name, "section_header": header},
            })

    if records:
        _batch_insert(client, records)
    print(f"{len(records)} chunks")
    return len(records)


def _embed_coaching_content(embedder: GoogleGenerativeAIEmbeddings, client) -> int:
    total = 0

    md_files = sorted(WORKSHEETS_DIR.glob("*.md"))
    for md_path in md_files:
        if md_path.name in ("00-worksheet-index.md", "gl-00-workbook-index.md"):
            continue
        total += _embed_md_file(embedder, client, md_path, md_path.stem)

    if CURRICULUM_MAP_PATH.exists():
        total += _embed_md_file(embedder, client, CURRICULUM_MAP_PATH, "curriculum_map")

    if EBOOK_PATH.exists():
        total += _embed_md_file(embedder, client, EBOOK_PATH, "ebook_extraction")

    return total


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Embed SuperPatch content into star_embeddings",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--sales-only", action="store_true",
        help="Only embed sales roadmap specs",
    )
    group.add_argument(
        "--coaching-only", action="store_true",
        help="Only embed coaching worksheets and docs",
    )
    args = parser.parse_args()

    _ = os.environ["GOOGLE_API_KEY"]

    embedder = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, output_dimensionality=768)
    client = get_supabase_client()

    total = 0

    if not args.coaching_only:
        print("=== Embedding sales content ===")
        total += _embed_sales_content(embedder, client)

    if not args.sales_only:
        print("\n=== Embedding coaching content ===")
        total += _embed_coaching_content(embedder, client)

    print(f"\nDone. {total} total chunks embedded.")


if __name__ == "__main__":
    main()
