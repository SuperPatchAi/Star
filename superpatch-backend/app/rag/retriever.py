"""Semantic search over the star_embeddings table using pgvector cosine similarity.

Requires a Supabase SQL function. Run this in the Supabase SQL editor:

    CREATE OR REPLACE FUNCTION match_star_embeddings(
        query_embedding vector(768),
        filter_domain text DEFAULT NULL,
        filter_source_id text DEFAULT NULL,
        filter_content_type text DEFAULT NULL,
        match_limit int DEFAULT 5
    )
    RETURNS TABLE (
        id uuid,
        domain text,
        content_type text,
        source_id text,
        section_key text,
        content text,
        metadata jsonb,
        similarity float
    )
    LANGUAGE plpgsql
    STABLE
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            e.id,
            e.domain,
            e.content_type,
            e.source_id,
            e.section_key,
            e.content,
            e.metadata,
            1 - (e.embedding <=> query_embedding) AS similarity
        FROM star_embeddings e
        WHERE (filter_domain IS NULL OR e.domain = filter_domain)
          AND (filter_source_id IS NULL OR e.source_id = filter_source_id)
          AND (filter_content_type IS NULL OR e.content_type = filter_content_type)
        ORDER BY e.embedding <=> query_embedding
        LIMIT match_limit;
    END;
    $$;
"""
from __future__ import annotations

import os

import httpx
from langchain_google_genai import GoogleGenerativeAIEmbeddings

EMBEDDING_MODEL = "models/gemini-embedding-001"

_embedder: GoogleGenerativeAIEmbeddings | None = None


def _get_embedder() -> GoogleGenerativeAIEmbeddings:
    global _embedder
    if _embedder is None:
        _embedder = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL, output_dimensionality=768
        )
    return _embedder


async def search(
    query: str,
    domain: str | None = None,
    source_id: str | None = None,
    content_type: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Run a semantic similarity search against the star_embeddings table.

    Parameters
    ----------
    query:
        Natural-language search query to embed and match.
    domain:
        Optional filter — ``'sales'`` or ``'coaching'``.
    source_id:
        Optional filter — product id (e.g. ``'Freedom'``) or worksheet id.
    content_type:
        Optional filter — ``'opening'``, ``'discovery'``, ``'objection_handling'``,
        ``'closing'``, ``'followup'``, ``'product_info'``, ``'presentation'``,
        ``'worksheet_question'``, ``'framework'``, ``'scoring_rubric'``,
        ``'case_study'``.
    limit:
        Maximum number of results (default 5).

    Returns
    -------
    list[dict]
        Each dict contains: ``content``, ``source_id``, ``content_type``,
        ``domain``, ``section_key``, ``similarity``, ``metadata``.
    """
    embedder = _get_embedder()
    query_vector = await embedder.aembed_query(query)

    supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{supabase_url}/rest/v1/rpc/match_star_embeddings",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
            },
            json={
                "query_embedding": query_vector,
                "filter_domain": domain,
                "filter_source_id": source_id,
                "filter_content_type": content_type,
                "match_limit": limit,
            },
        )
        response.raise_for_status()
        rows: list[dict] = response.json()

    return [
        {
            "content": row["content"],
            "source_id": row["source_id"],
            "content_type": row["content_type"],
            "domain": row["domain"],
            "section_key": row.get("section_key"),
            "similarity": row["similarity"],
            "metadata": row.get("metadata", {}),
        }
        for row in rows
    ]
