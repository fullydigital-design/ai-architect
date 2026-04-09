/**
 * SuggestedQuestions — Phase 4 of Workflow Study Mode
 *
 * Renders contextual suggested questions as clickable pills below the
 * workflow import summary in Study mode.
 */

import { Lightbulb } from 'lucide-react';
import type { SuggestedQuestion } from '../../../services/question-suggester';

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onSelect: (question: string) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  overview: 'border-accent/25 text-accent-text hover:bg-accent-muted hover:border-accent/40',
  technique: 'border-state-info/25 text-state-info hover:bg-state-info-muted hover:border-state-info/40',
  node: 'border-state-warning/25 text-state-warning hover:bg-state-warning-muted hover:border-state-warning/40',
  model: 'border-accent/25 text-accent-text hover:bg-accent-muted hover:border-accent/40',
  pack: 'border-state-info/25 text-state-info hover:bg-state-info-muted hover:border-state-info/40',
  improve: 'border-state-success/25 text-state-success hover:bg-state-success-muted hover:border-state-success/40',
};

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-3 px-1">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="w-3 h-3 text-state-warning" />
        <span className="text-[10px] text-content-muted">Suggested questions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q) => (
          <button
            key={q.label}
            onClick={() => onSelect(q.question)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer ${
              CATEGORY_STYLES[q.category] ?? CATEGORY_STYLES.overview
            }`}
            title={q.question}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
