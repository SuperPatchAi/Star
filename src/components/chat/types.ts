import type { UIMessage } from 'ai';

export type DataPartSchemas = {
  'coaching-question': {
    skillId: string;
    questionId: string;
    text: string;
    type: 'scale' | 'checkbox' | 'choice' | 'open_ended' | 'fill_in' | 'table';
    options?: { value: string; label: string }[];
    maxItems?: number;
  };
  'score-result': {
    skillId: string;
    scoringType: 'ladder' | 'scale' | 'ratio';
    level?: string;
    score?: number;
    interpretation: string;
    populationPct?: number;
  };
  'prerequisite-blocked': {
    skillId: string;
    missingSkills: { id: string; name: string }[];
  };
  'skill-progress': {
    program: string;
    currentPhase: number;
    completedCount: number;
    totalCount: number;
    nextSkill?: { id: string; name: string };
  };
};

export type MyUIMessage = UIMessage<never, DataPartSchemas>;
