-- RPC function for semantic search over star_embeddings via pgvector cosine similarity
CREATE OR REPLACE FUNCTION match_star_embeddings(
    query_embedding extensions.vector(768),
    filter_domain text DEFAULT NULL,
    filter_source_id text DEFAULT NULL,
    filter_content_type text DEFAULT NULL,
    match_limit int DEFAULT 5
)
RETURNS TABLE (
    id bigint,
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
    FROM public.star_embeddings e
    WHERE (filter_domain IS NULL OR e.domain = filter_domain)
      AND (filter_source_id IS NULL OR e.source_id = filter_source_id)
      AND (filter_content_type IS NULL OR e.content_type = filter_content_type)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_limit;
END;
$$;
