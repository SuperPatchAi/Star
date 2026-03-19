from __future__ import annotations

from typing import Optional

from langchain_core.tools import tool


@tool
async def search_scripts(
    query: str,
    product_id: Optional[str] = None,
    content_type: Optional[str] = None,
) -> list[dict]:
    """Search sales scripts and coaching content using semantic similarity.

    Searches the embedded knowledge base for relevant scripts, word tracks,
    coaching frameworks, and worksheet content.

    Parameters
    ----------
    query:
        Natural-language description of what you're looking for.
    product_id:
        Optional product filter (e.g. 'Freedom', 'Ignite', 'REM').
    content_type:
        Optional content type filter. Valid values: opening, discovery,
        objection_handling, closing, followup, product_info, presentation,
        worksheet_question, framework, scoring_rubric, case_study.
    """
    from app.rag.retriever import search

    results = await search(
        query=query,
        source_id=product_id,
        content_type=content_type,
        limit=5,
    )
    return results
