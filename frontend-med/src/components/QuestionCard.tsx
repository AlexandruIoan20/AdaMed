import { useEffect, useMemo, useState } from "react";
import { questionFigures, type AnswerResult, type Question } from "../types/quiz.types";
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

function letterFor(index: number) {
  return String.fromCharCode(97 + index); // 0 -> a, 1 -> b ...
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

  const hasMultipleCorrect = useMemo(
    () => (result ? result.correctAnswerIds.length > 1 : question.answers.length > 5),
    [result, question.answers.length],
  );

  const figures = questionFigures(question);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7">
      {/* Enunțul — serif, ca într-un caiet de grile tipărit. */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Întrebarea</p>
        <h1 className="font-serif text-[1.55rem] leading-snug text-foreground sm:text-[1.8rem]">
          {question.text}
        </h1>

        {/* Figurile întrebării sunt vizibile cât rezolvi (pot fi necesare pentru răspuns);
            după submit migrează în panoul de studiu, lângă explicație. */}
        {!answered && figures.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {figures.map((src, i) => (
              <figure
                key={src}
                className="overflow-hidden rounded-xl border border-border bg-muted/30"
              >
                <img
                  src={src}
                  alt={`Imaginea ${i + 1} a întrebării`}
                  className="max-h-[22rem] w-full object-contain"
                />
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {question.answers.map((option, i) => (
          <AnswerOption
            key={option.id}
            option={option}
            letter={letterFor(i)}
            checked={answered ? result!.selectedAnswerIds.includes(option.id) : selected.has(option.id)}
            disabled={answered}
            state={optionState(option.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {answered
            ? "Vezi explicația în panoul din dreapta."
            : hasMultipleCorrect
              ? "Bifează toate variantele corecte."
              : "Bifează variantele corecte — pot fi una sau mai multe."}
        </p>
        {!answered ? (
          <Button
            size="lg"
            className="h-11 px-6 text-[0.95rem] sm:w-auto"
            disabled={selected.size === 0 || submitting}
            onClick={() => onSubmit([...selected])}
          >
            {submitting ? "Se trimite..." : "Trimite răspuns"}
          </Button>
        ) : (
          <Button size="lg" className="h-11 px-6 text-[0.95rem] sm:w-auto" onClick={onNext}>
            {isLast ? "Vezi rezultatul" : "Următoarea grilă"}
          </Button>
        )}
      </div>
    </div>
  );
}
