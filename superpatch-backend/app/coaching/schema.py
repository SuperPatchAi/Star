from dataclasses import dataclass, field
from typing import Optional


@dataclass
class QuestionOption:
    value: str
    label: str


@dataclass
class Question:
    id: str
    text: str
    type: str  # scale, checkbox, choice, open_ended, fill_in, table
    options: list[QuestionOption] = field(default_factory=list)
    max_items: Optional[int] = None
    scale_min: int = 1
    scale_max: int = 10


@dataclass
class ScoringLevel:
    name: str
    range_label: str
    population_pct: Optional[float] = None


@dataclass
class ScoringRubric:
    type: str  # ladder, scale, ratio
    levels: list[ScoringLevel] = field(default_factory=list)
    dimensions: list[str] = field(default_factory=list)
    target_ratio: Optional[str] = None  # e.g. "80/15/5"


@dataclass
class CaseStudy:
    title: str
    content: str


@dataclass
class CoachingSkill:
    id: str
    name: str
    program: str  # 100m_blueprint | global_leaders
    phase: int
    week: int
    frameworks: list[str] = field(default_factory=list)
    worksheet_path: str = ""
    prerequisites: list[str] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)
    scoring: Optional[ScoringRubric] = None
    case_study: Optional[CaseStudy] = None
    actions: list[str] = field(default_factory=list)
