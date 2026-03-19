from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

from langchain_core.tools import tool

from app.db.supabase_client import get_supabase_client

ROADMAP_DIR = Path(__file__).resolve().parents[4] / "src" / "data" / "roadmap-specs-v2"

VALID_STEPS = [
    "add_contact",
    "opening",
    "discovery",
    "presentation",
    "samples",
    "followup",
    "closing",
    "objections",
    "purchase_links",
]


@tool
def get_contact(contact_id: str, user_id: str) -> dict:
    """Retrieve a single contact by ID for the given user.

    Returns the full contact record from d2c_contacts including all sales-flow
    fields (current_step, opening_types, questions_asked, objections, outcome,
    follow_up_day, sample info, address, etc.).
    """
    try:
        sb = get_supabase_client()
        result = (
            sb.table("d2c_contacts")
            .select("*")
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:
        return {"error": f"Failed to fetch contact {contact_id}: {exc}"}


@tool
def list_contacts_by_filter(
    user_id: str,
    stage: Optional[str] = None,
    outcome: Optional[str] = None,
    product_id: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """List contacts for a user with optional filters.

    Filters:
    - stage: filter by current_step (e.g. 'discovery', 'samples')
    - outcome: filter by outcome value (e.g. 'won', 'lost')
    - product_id: filter contacts whose product_ids array contains this product
    - limit: max number of results (default 20)

    Returns a list of contact dicts ordered by most-recently updated first.
    """
    try:
        sb = get_supabase_client()
        query = sb.table("d2c_contacts").select("*").eq("user_id", user_id)

        if stage:
            query = query.eq("current_step", stage)
        if outcome:
            query = query.eq("outcome", outcome)
        if product_id:
            query = query.contains("product_ids", [product_id])

        query = query.order("updated_at", desc=True).limit(limit)
        result = query.execute()
        return result.data
    except Exception as exc:
        return [{"error": f"Failed to list contacts: {exc}"}]


@tool
def get_dashboard_stats(user_id: str) -> dict:
    """Get pipeline statistics for the user's dashboard.

    Returns:
    - total_contacts: total number of contacts
    - contacts_per_step: count of contacts at each sales step
    - contacts_per_outcome: count of contacts per outcome (won/lost/pending)
    - pending_follow_ups: count of contacts with active follow-up sequences
    """
    try:
        sb = get_supabase_client()
        contacts = (
            sb.table("d2c_contacts")
            .select("current_step, outcome, follow_up_day, sample_sent")
            .eq("user_id", user_id)
            .execute()
        ).data

        total = len(contacts)

        step_counts: dict[str, int] = {}
        outcome_counts: dict[str, int] = {}
        pending_follow_ups = 0

        for c in contacts:
            step = c.get("current_step", "unknown")
            step_counts[step] = step_counts.get(step, 0) + 1

            out = c.get("outcome") or "pending"
            outcome_counts[out] = outcome_counts.get(out, 0) + 1

            if c.get("follow_up_day") is not None and c.get("sample_sent"):
                pending_follow_ups += 1

        return {
            "total_contacts": total,
            "contacts_per_step": step_counts,
            "contacts_per_outcome": outcome_counts,
            "pending_follow_ups": pending_follow_ups,
        }
    except Exception as exc:
        return {"error": f"Failed to get dashboard stats: {exc}"}


@tool
def get_sales_analytics(user_id: str) -> dict:
    """Get sales analytics showing common patterns across all contacts.

    Returns:
    - common_questions: frequency map of discovery questions asked
    - common_objections: frequency map of objections encountered
    - opening_distribution: frequency map of opening types used
    - closing_distribution: frequency map of closing techniques used
    """
    try:
        sb = get_supabase_client()
        contacts = (
            sb.table("d2c_contacts")
            .select(
                "questions_asked, objections_encountered, "
                "opening_types, closing_techniques"
            )
            .eq("user_id", user_id)
            .execute()
        ).data

        questions: dict[str, int] = {}
        objections: dict[str, int] = {}
        openings: dict[str, int] = {}
        closings: dict[str, int] = {}

        def _count_jsonb(jsonb_val: object, target: dict[str, int]) -> None:
            """Safely tally strings from JSONB that may contain dicts, lists, or strings."""
            if isinstance(jsonb_val, str):
                target[jsonb_val] = target.get(jsonb_val, 0) + 1
            elif isinstance(jsonb_val, list):
                for item in jsonb_val:
                    if isinstance(item, str):
                        target[item] = target.get(item, 0) + 1
            elif isinstance(jsonb_val, dict):
                for v in jsonb_val.values():
                    _count_jsonb(v, target)

        for c in contacts:
            for qa in (c.get("questions_asked") or {}).values():
                _count_jsonb(qa, questions)

            for ob in (c.get("objections_encountered") or {}).values():
                _count_jsonb(ob, objections)

            for ot_val in (c.get("opening_types") or {}).values():
                if isinstance(ot_val, str):
                    openings[ot_val] = openings.get(ot_val, 0) + 1

            for ct_val in (c.get("closing_techniques") or {}).values():
                if isinstance(ct_val, str):
                    closings[ct_val] = closings.get(ct_val, 0) + 1

        return {
            "common_questions": dict(
                sorted(questions.items(), key=lambda x: x[1], reverse=True)
            ),
            "common_objections": dict(
                sorted(objections.items(), key=lambda x: x[1], reverse=True)
            ),
            "opening_distribution": openings,
            "closing_distribution": closings,
        }
    except Exception as exc:
        return {"error": f"Failed to get sales analytics: {exc}"}


@tool
def get_product_info(product_id: str) -> dict:
    """Look up product information from the roadmap specification files.

    Returns the metadata section for the given product including name,
    category, tagline, benefits, and purpose. The product_id should match
    the product name (e.g. 'freedom', 'ignite', 'boost').
    """
    try:
        normalized = product_id.strip().lower()
        for spec_file in ROADMAP_DIR.glob("*.json"):
            file_stem = spec_file.stem.lower()
            if file_stem.startswith(normalized):
                with open(spec_file, "r") as f:
                    data = json.load(f)
                return data.get("metadata", {"error": "No metadata in spec file"})

        available = [f.stem.split("_")[0] for f in ROADMAP_DIR.glob("*.json")]
        return {
            "error": f"No roadmap spec found for product '{product_id}'",
            "available_products": available,
        }
    except Exception as exc:
        return {"error": f"Failed to load product info: {exc}"}


@tool
def get_follow_up_reminders(user_id: str) -> list[dict]:
    """Get contacts with active follow-up reminders for the user.

    Returns contacts where a sample has been sent and follow_up_day is set,
    ordered by follow_up_day ascending (most urgent first). Includes
    contact name, phone, email, current step, follow-up day, and products.
    """
    try:
        sb = get_supabase_client()
        result = (
            sb.table("d2c_contacts")
            .select(
                "id, first_name, last_name, phone, email, "
                "current_step, follow_up_day, product_ids, sample_sent_at"
            )
            .eq("user_id", user_id)
            .eq("sample_sent", True)
            .not_.is_("follow_up_day", "null")
            .order("follow_up_day", desc=False)
            .execute()
        )
        return result.data
    except Exception as exc:
        return [{"error": f"Failed to get follow-up reminders: {exc}"}]


@tool
def search_scripts(
    query: str,
    product_id: Optional[str] = None,
    content_type: Optional[str] = None,
) -> list[dict]:
    """Search sales scripts and word tracks by keyword or semantic similarity.

    This will perform semantic search over the star_embeddings table once
    the RAG pipeline is connected. Filters by product_id and content_type
    (e.g. 'opening', 'objection', 'closing') when provided.

    Currently returns an empty list — RAG search will be wired in a future update.
    """
    return []
