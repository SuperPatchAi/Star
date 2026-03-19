from typing import Optional
from langgraph.graph import MessagesState


class UnifiedAgentState(MessagesState):
    user_id: str
    current_page: Optional[str] = None
    selected_contact_id: Optional[str] = None
    intent: Optional[str] = None
    domain_hint: Optional[str] = None
    program: Optional[str] = None
    current_phase: Optional[int] = None
    current_week: Optional[int] = None
    current_skill: Optional[str] = None
    completed_skills: list[str] = []
    skill_outputs: dict[str, dict] = {}
