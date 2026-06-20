import { useEffect, useState } from "react";
import type { AnswerResult, Question } from "../types/quiz.types";
import AnswerOption, { type OptionVisualState } from "./AnswerOption";
import { Button } from "./ui/button";

interface Props {
  question: Question;
  result: AnswerResult | null; // null = încă nerăspunsă
  submitting: boolean;
  onSubmit: (selectedIds: string[]) => void;
  onNext: () => void;
  isLast: boolean;
}

export default function QuestionCard({ question, result, submitting, onSubmit, onNext, isLast }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selecția când se schimbă grila.
  useEffect(() => {
    setSelected(new Set());
  }, [question.id]);

  const answered = result !== null;

  function toggle(id: string) {
    if (answered) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function optionState(id: string): OptionVisualState {
    if (!result) return "neutral";
    const isCorrect = result.correctAnswerIds.includes(id);
    const isSelected = result.selectedAnswerIds.includes(id);
    if (isCorrect && isSelected) return "correct";
    if (!isCorrect && isSelected) return "wrong";
    if (isCorrect && !isSelected) return "missed";
    return "neutral";
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{question.text}</h2>

      <div className="space-y-2">
        {question.answers.map((option) => (
          <AnswerOption
            key={option.id}
            option={option}
            checked={answered ? result!.selectedAnswerIds.includes(option.id) : selected.has(option.id)}
            disabled={answered}
            state={optionState(option.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      {answered && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
          <p className={result!.wasCorrect ? "font-medium text-green-600" : "font-medium text-red-600"}>
            {result!.wasCorrect ? "Răspuns corect!" : "Răspuns greșit"}
          </p>
          {!result!.wasCorrect && (
            <p className="text-sm text-muted-foreground">
              Verde = corect bifat · Roșu = bifat greșit · Portocaliu = corect, dar omis.
            </p>
          )}
          {result!.explanation && (
            <p className="text-sm text-foreground">{result!.explanation}</p>
          )}
        </div>
      )}

      {!answered ? (
        <Button
          className="w-full"
          disabled={selected.size === 0 || submitting}
          onClick={() => onSubmit([...selected])}
        >
          {submitting ? "Se trimite..." : "Trimite răspuns"}
        </Button>
      ) : (
        <Button className="w-full" onClick={onNext}>
          {isLast ? "Vezi rezultatul" : "Următoarea grilă"}
        </Button>
      )}
    </div>
  );
}
