from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from langchain_core.tools import tool

from app.db.supabase_client import get_supabase_client


def _get_team_member_ids(user_id: str) -> list[str]:
    """Return member user_ids for a leader, or empty list if no team."""
    sb = get_supabase_client()
    rows = (
        sb.table("d2c_team_members")
        .select("member_id")
        .eq("leader_id", user_id)
        .execute()
    ).data
    return [r["member_id"] for r in rows] if rows else []


def _get_member_profiles(member_ids: list[str]) -> dict[str, dict]:
    """Return {user_id: {full_name, bydesign_rank}} for given member IDs."""
    if not member_ids:
        return {}
    sb = get_supabase_client()
    rows = (
        sb.table("user_profiles")
        .select("id, full_name, bydesign_rank")
        .in_("id", member_ids)
        .execute()
    ).data
    return {r["id"]: r for r in rows} if rows else {}


def _get_contacts_for_members(
    member_ids: list[str],
    select: str = "user_id, outcome, follow_up_day, sample_sent",
    cutoff: str | None = None,
) -> list[dict]:
    """Batch-fetch contacts for all member_ids in a single query."""
    if not member_ids:
        return []
    sb = get_supabase_client()
    query = sb.table("d2c_contacts").select(select).in_("user_id", member_ids)
    if cutoff:
        query = query.gte("created_at", cutoff)
    return query.execute().data or []


def _period_cutoff(period: str) -> str | None:
    now = datetime.now(timezone.utc)
    if period == "week":
        cutoff = now - timedelta(days=7)
    elif period == "month":
        cutoff = now - timedelta(days=30)
    else:
        return None
    return cutoff.isoformat()


@tool
def get_team_overview(user_id: str) -> str:
    """Get a high-level overview of the leader's team performance.

    Returns team size, total contacts across the team, win/loss/pending
    counts, win rate, average contacts per rep, and active follow-ups.
    """
    try:
        member_ids = _get_team_member_ids(user_id)
        if not member_ids:
            return json.dumps({"error": "You don't have any team members yet."})

        profiles = _get_member_profiles(member_ids)
        all_contacts = _get_contacts_for_members(member_ids)

        total = len(all_contacts)
        won = sum(1 for c in all_contacts if c.get("outcome") == "won")
        lost = sum(1 for c in all_contacts if c.get("outcome") == "lost")
        pending = total - won - lost
        win_rate = round(won / total * 100, 1) if total else 0
        avg_per_rep = round(total / len(member_ids), 1) if member_ids else 0
        active_followups = sum(
            1 for c in all_contacts
            if c.get("follow_up_day") is not None and c.get("sample_sent")
        )

        members = []
        for mid in member_ids:
            p = profiles.get(mid, {})
            members.append({
                "id": mid,
                "name": p.get("full_name") or "Unknown",
                "rank": p.get("bydesign_rank") or None,
            })

        return json.dumps({
            "team_size": len(member_ids),
            "total_contacts": total,
            "won": won,
            "lost": lost,
            "pending": pending,
            "win_rate": win_rate,
            "avg_contacts_per_rep": avg_per_rep,
            "active_follow_ups": active_followups,
            "members": members,
        })
    except Exception as exc:
        return json.dumps({"error": f"Failed to get team overview: {exc}"})


@tool
def get_team_member_stats(user_id: str, member_id: str) -> str:
    """Get detailed stats for a specific team member.

    Verifies the leader-member relationship, then returns the member's
    name, rank, total contacts, wins, losses, samples sent, step
    distribution, and last activity timestamp.
    """
    try:
        sb = get_supabase_client()
        rel = (
            sb.table("d2c_team_members")
            .select("id")
            .eq("leader_id", user_id)
            .eq("member_id", member_id)
            .execute()
        ).data
        if not rel:
            return json.dumps({"error": "This person is not on your team."})

        profile_rows = (
            sb.table("user_profiles")
            .select("full_name, bydesign_rank")
            .eq("id", member_id)
            .single()
            .execute()
        ).data
        name = (profile_rows or {}).get("full_name", "Unknown")
        rank = (profile_rows or {}).get("bydesign_rank", None)

        contacts = (
            sb.table("d2c_contacts")
            .select("current_step, outcome, sample_sent, updated_at")
            .eq("user_id", member_id)
            .execute()
        ).data or []

        total = len(contacts)
        won = sum(1 for c in contacts if c.get("outcome") == "won")
        lost = sum(1 for c in contacts if c.get("outcome") == "lost")
        pending = total - won - lost
        samples = sum(1 for c in contacts if c.get("sample_sent"))

        steps: dict[str, int] = {}
        for c in contacts:
            step = c.get("current_step", "unknown")
            steps[step] = steps.get(step, 0) + 1

        last_activity = None
        if contacts:
            dates = [c.get("updated_at") for c in contacts if c.get("updated_at")]
            if dates:
                last_activity = max(dates)

        return json.dumps({
            "name": name,
            "rank": rank or "",
            "total_contacts": total,
            "won": won,
            "lost": lost,
            "pending": pending,
            "samples_sent": samples,
            "step_distribution": steps,
            "last_activity": last_activity,
        })
    except Exception as exc:
        return json.dumps({"error": f"Failed to get member stats: {exc}"})


@tool
def list_struggling_members(
    user_id: str,
    metric: Optional[str] = "inactive",
    limit: int = 5,
) -> str:
    """Identify team members who may need coaching attention.

    Metrics:
    - "inactive": members with no contact activity in 3+ days
    - "low_win_rate": members with <20% win rate
    - "no_contacts": members with zero contacts
    """
    try:
        member_ids = _get_team_member_ids(user_id)
        if not member_ids:
            return json.dumps({"error": "You don't have any team members yet."})

        profiles = _get_member_profiles(member_ids)
        metric = metric or "inactive"

        all_contacts = _get_contacts_for_members(
            member_ids,
            select="user_id, outcome, updated_at",
        )

        contacts_by_member: dict[str, list[dict]] = {mid: [] for mid in member_ids}
        for c in all_contacts:
            uid = c.get("user_id")
            if uid in contacts_by_member:
                contacts_by_member[uid].append(c)

        results: list[dict] = []

        for mid in member_ids:
            contacts = contacts_by_member[mid]
            name = (profiles.get(mid) or {}).get("full_name", "Unknown")
            total = len(contacts)

            if metric == "no_contacts" and total == 0:
                results.append({"name": name, "reason": "0 contacts", "severity": "high"})

            elif metric == "low_win_rate" and total > 0:
                won = sum(1 for c in contacts if c.get("outcome") == "won")
                rate = round(won / total * 100, 1)
                if rate < 20:
                    results.append({
                        "name": name,
                        "reason": f"{rate}% win rate ({won}/{total})",
                        "severity": "high" if rate == 0 else "medium",
                    })

            elif metric == "inactive" and total > 0:
                dates = [c.get("updated_at") for c in contacts if c.get("updated_at")]
                if dates:
                    latest = max(dates)
                    cutoff = (
                        datetime.now(timezone.utc) - timedelta(days=3)
                    ).isoformat()
                    if latest < cutoff:
                        results.append({
                            "name": name,
                            "reason": f"last active {latest[:10]}",
                            "severity": "medium",
                        })
                else:
                    results.append({
                        "name": name,
                        "reason": "no recorded activity",
                        "severity": "medium",
                    })
            elif metric == "inactive" and total == 0:
                results.append({
                    "name": name,
                    "reason": "no contacts or activity",
                    "severity": "high",
                })

        return json.dumps(results[:limit])
    except Exception as exc:
        return json.dumps({"error": f"Failed to list struggling members: {exc}"})


@tool
def get_team_leaderboard(
    user_id: str,
    metric: Optional[str] = "wins",
    period: Optional[str] = "month",
) -> str:
    """Rank team members by a performance metric over a time period.

    Metrics: "wins", "contacts", "samples".
    Periods: "week", "month", "all".
    """
    try:
        member_ids = _get_team_member_ids(user_id)
        if not member_ids:
            return json.dumps({"error": "You don't have any team members yet."})

        profiles = _get_member_profiles(member_ids)
        metric = metric or "wins"
        period = period or "month"
        cutoff = _period_cutoff(period)

        all_contacts = _get_contacts_for_members(
            member_ids,
            select="user_id, outcome, sample_sent, created_at",
            cutoff=cutoff,
        )

        contacts_by_member: dict[str, list[dict]] = {mid: [] for mid in member_ids}
        for c in all_contacts:
            uid = c.get("user_id")
            if uid in contacts_by_member:
                contacts_by_member[uid].append(c)

        board: list[dict] = []

        for mid in member_ids:
            contacts = contacts_by_member[mid]
            name = (profiles.get(mid) or {}).get("full_name", "Unknown")

            if metric == "wins":
                score = sum(1 for c in contacts if c.get("outcome") == "won")
            elif metric == "samples":
                score = sum(1 for c in contacts if c.get("sample_sent"))
            else:
                score = len(contacts)

            board.append({"name": name, "value": score})

        board.sort(key=lambda x: -x["value"])

        period_label = {"week": "This Week", "month": "This Month", "all": "All Time"}.get(
            period, period
        )

        return json.dumps({
            "metric": f"{metric.capitalize()} ({period_label})",
            "leaderboard": board,
        })
    except Exception as exc:
        return json.dumps({"error": f"Failed to get team leaderboard: {exc}"})


@tool
def get_team_activity(user_id: str, limit: int = 20) -> str:
    """Get recent activity across all team members.

    Queries the d2c_activity_log for team members and returns a
    formatted feed with member names, event types, and timestamps.
    """
    try:
        member_ids = _get_team_member_ids(user_id)
        if not member_ids:
            return json.dumps({"error": "You don't have any team members yet."})

        sb = get_supabase_client()
        profiles = _get_member_profiles(member_ids)

        events = (
            sb.table("d2c_activity_log")
            .select("user_id, event_type, metadata, created_at")
            .in_("user_id", member_ids)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        ).data or []

        if not events:
            return json.dumps([])

        event_labels = {
            "contact_created": "created a new contact",
            "step_changed": "advanced a contact",
            "sample_sent": "sent a sample",
            "sample_confirmed": "confirmed sample received",
            "followup_completed": "completed a follow-up",
            "outcome_changed": "recorded an outcome",
            "invite_sent": "sent a team invite",
            "member_joined": "joined the team",
            "purchase_matched": "matched a purchase",
            "downline_synced": "synced downline data",
        }

        result = []
        for ev in events:
            name = (profiles.get(ev["user_id"]) or {}).get("full_name", "Unknown")
            etype = ev.get("event_type", "unknown")
            desc = event_labels.get(etype, etype)
            meta = ev.get("metadata") or {}
            if meta.get("contact_name"):
                desc += f" ({meta['contact_name']})"
            elif meta.get("new_step"):
                desc += f" → {meta['new_step']}"
            result.append({
                "member_name": name,
                "description": desc,
                "event_type": etype,
                "created_at": ev.get("created_at", ""),
            })

        return json.dumps(result)
    except Exception as exc:
        return json.dumps({"error": f"Failed to get team activity: {exc}"})
