"""Sales tool tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

from app.agent.tools.sales_read import (
    get_contact,
    get_dashboard_stats,
    list_contacts_by_filter,
)
from app.agent.tools.sales_write import advance_contact_step, update_contact_fields
from tests.conftest import TEST_CONTACT_ID, TEST_USER_ID


def test_get_contact_returns_contact(mock_supabase: object) -> None:
    """get_contact returns contact dict when Supabase returns data."""
    contact_data = {
        "id": TEST_CONTACT_ID,
        "user_id": TEST_USER_ID,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "current_step": "discovery",
    }

    chain = mock_supabase.table.return_value
    chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = contact_data

    result = get_contact.invoke({"contact_id": TEST_CONTACT_ID, "user_id": TEST_USER_ID})

    assert result == contact_data
    mock_supabase.table.assert_called_once_with("d2c_contacts")


def test_get_contact_returns_error_on_exception(mock_supabase: object) -> None:
    """get_contact returns error dict when Supabase raises."""
    chain = mock_supabase.table.return_value
    chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.side_effect = Exception(
        "Connection failed"
    )

    result = get_contact.invoke({"contact_id": TEST_CONTACT_ID, "user_id": TEST_USER_ID})

    assert "error" in result
    assert "Connection failed" in result["error"]


def test_list_contacts_by_filter_no_filters(mock_supabase: object) -> None:
    """list_contacts_by_filter returns contacts with no filters."""
    contacts = [
        {"id": "c1", "first_name": "Alice", "current_step": "samples"},
        {"id": "c2", "first_name": "Bob", "current_step": "discovery"},
    ]

    chain = mock_supabase.table.return_value
    chain.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = contacts

    result = list_contacts_by_filter.invoke({"user_id": TEST_USER_ID})

    assert result == contacts


def test_list_contacts_by_filter_with_stage(mock_supabase: object) -> None:
    """list_contacts_by_filter applies stage filter."""
    contacts = [{"id": "c1", "current_step": "discovery"}]

    chain = mock_supabase.table.return_value
    q = chain.select.return_value.eq.return_value
    q.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = contacts

    result = list_contacts_by_filter.invoke(
        {"user_id": TEST_USER_ID, "stage": "discovery"}
    )

    assert result == contacts


def test_list_contacts_by_filter_with_outcome(mock_supabase: object) -> None:
    """list_contacts_by_filter applies outcome filter."""
    contacts = [{"id": "c1", "outcome": "won"}]

    chain = mock_supabase.table.return_value
    q = chain.select.return_value.eq.return_value
    q.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = contacts

    result = list_contacts_by_filter.invoke(
        {"user_id": TEST_USER_ID, "outcome": "won"}
    )

    assert result == contacts


def test_list_contacts_by_filter_with_product_id(mock_supabase: object) -> None:
    """list_contacts_by_filter applies product_id filter via contains."""
    contacts = [{"id": "c1", "product_ids": ["freedom"]}]

    chain = mock_supabase.table.return_value
    q = chain.select.return_value.eq.return_value
    q.contains.return_value.order.return_value.limit.return_value.execute.return_value.data = contacts

    result = list_contacts_by_filter.invoke(
        {"user_id": TEST_USER_ID, "product_id": "freedom"}
    )

    assert result == contacts


def test_get_dashboard_stats_returns_proper_structure(mock_supabase: object) -> None:
    """get_dashboard_stats returns total_contacts, contacts_per_step, etc."""
    raw_contacts = [
        {"current_step": "discovery", "outcome": None, "follow_up_day": None, "sample_sent": False},
        {"current_step": "samples", "outcome": "pending", "follow_up_day": 2, "sample_sent": True},
        {"current_step": "discovery", "outcome": "won", "follow_up_day": None, "sample_sent": False},
    ]

    chain = mock_supabase.table.return_value
    chain.select.return_value.eq.return_value.execute.return_value.data = raw_contacts

    result = get_dashboard_stats.invoke({"user_id": TEST_USER_ID})

    assert "total_contacts" in result
    assert result["total_contacts"] == 3
    assert "contacts_per_step" in result
    assert result["contacts_per_step"]["discovery"] == 2
    assert result["contacts_per_step"]["samples"] == 1
    assert "contacts_per_outcome" in result
    assert "pending_follow_ups" in result
    assert result["pending_follow_ups"] == 1


def test_advance_contact_step_validates_step_name(mock_supabase: object) -> None:
    """advance_contact_step returns error for invalid step."""
    result = advance_contact_step.invoke(
        {
            "contact_id": TEST_CONTACT_ID,
            "user_id": TEST_USER_ID,
            "new_step": "invalid_step",
        }
    )

    assert "error" in result
    assert "Invalid step" in result["error"]


def test_advance_contact_step_succeeds_for_valid_step(mock_supabase: object) -> None:
    """advance_contact_step updates contact for valid step."""
    updated = {"id": TEST_CONTACT_ID, "current_step": "presentation"}

    chain = mock_supabase.table.return_value
    chain.update.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = updated

    result = advance_contact_step.invoke(
        {
            "contact_id": TEST_CONTACT_ID,
            "user_id": TEST_USER_ID,
            "new_step": "presentation",
        }
    )

    assert result == updated


def test_update_contact_fields_filters_unsafe_fields(mock_supabase: object) -> None:
    """update_contact_fields ignores user_id, id, and other unsafe fields."""
    updated = {
        "id": TEST_CONTACT_ID,
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
    }

    chain = mock_supabase.table.return_value
    chain.update.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = updated

    result = update_contact_fields.invoke(
        {
            "contact_id": TEST_CONTACT_ID,
            "user_id": TEST_USER_ID,
            "fields": {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
                "user_id": "hacker-id",
                "id": "hacker-contact-id",
            },
        }
    )

    assert result == updated
    call_args = chain.update.call_args[0][0]
    assert "user_id" not in call_args
    assert "id" not in call_args
    assert call_args["first_name"] == "Jane"
    assert call_args["last_name"] == "Doe"
    assert call_args["email"] == "jane@example.com"


def test_update_contact_fields_returns_error_when_no_valid_fields(mock_supabase: object) -> None:
    """update_contact_fields returns error when all fields are unsafe."""
    result = update_contact_fields.invoke(
        {
            "contact_id": TEST_CONTACT_ID,
            "user_id": TEST_USER_ID,
            "fields": {"user_id": "x", "id": "y", "current_step": "closing"},
        }
    )

    assert "error" in result
    assert "No valid fields" in result["error"]
