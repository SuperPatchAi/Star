from __future__ import annotations

from langchain_core.tools import tool

from app.db.supabase_client import get_supabase_client

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

SAFE_FIELDS = {
    "first_name",
    "last_name",
    "email",
    "phone",
    "notes",
    "address_line1",
    "address_line2",
    "address_city",
    "address_state",
    "address_zip",
    "outcome",
}


@tool
def advance_contact_step(contact_id: str, user_id: str, new_step: str) -> dict:
    """Advance a contact to a new step in the 9-step sales flow.

    Valid steps in order: add_contact, opening, discovery, presentation,
    samples, followup, closing, objections, purchase_links.

    Updates the current_step field on the contact record and returns
    the updated contact. Returns an error if the step is invalid.
    """
    if new_step not in VALID_STEPS:
        return {
            "error": f"Invalid step '{new_step}'. Valid steps: {VALID_STEPS}"
        }

    try:
        sb = get_supabase_client()
        result = (
            sb.table("d2c_contacts")
            .update({"current_step": new_step})
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:
        return {"error": f"Failed to advance contact step: {exc}"}


@tool
def advance_follow_up_day(contact_id: str, user_id: str) -> dict:
    """Increment the follow-up day counter by 1 for a contact.

    Used after completing a follow-up task to move the contact to the
    next day in the 7-day follow-up sequence. Returns the updated contact
    with the new follow_up_day value.
    """
    try:
        sb = get_supabase_client()
        current = (
            sb.table("d2c_contacts")
            .select("follow_up_day")
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        current_day = current.data.get("follow_up_day") or 0
        result = (
            sb.table("d2c_contacts")
            .update({"follow_up_day": current_day + 1})
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:
        return {"error": f"Failed to advance follow-up day: {exc}"}


@tool
def update_contact_fields(contact_id: str, user_id: str, fields: dict) -> dict:
    """Update allowed fields on a contact record.

    Only safe fields can be updated: first_name, last_name, email, phone,
    notes, address_line1, address_line2, city, state, zip, country, outcome.

    Pass a dict of field names to new values. Fields not in the safe list
    are silently ignored. Returns the updated contact.
    """
    filtered = {k: v for k, v in fields.items() if k in SAFE_FIELDS}
    if not filtered:
        return {
            "error": "No valid fields to update. "
            f"Allowed fields: {sorted(SAFE_FIELDS)}"
        }

    try:
        sb = get_supabase_client()
        result = (
            sb.table("d2c_contacts")
            .update(filtered)
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:
        return {"error": f"Failed to update contact fields: {exc}"}
