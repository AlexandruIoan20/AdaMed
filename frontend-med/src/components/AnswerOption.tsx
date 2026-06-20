import { cn } from "../lib/utils";
import type { AnswerOption as AnswerOptionType } from "../types/quiz.types";

export type OptionVisualState = "neutral" | "correct" | "wrong" | "missed";

interface Props {
  option: AnswerOptionType;
  checked: boolean;
  disabled: boolean;
  state: OptionVisualState; // doar relevant după submit; altfel "neutral"
  onToggle: (id: string) => void;
}

// Culori dupa submit (vezi plan §4.3):
//   correct = verde   (corect si bifat)
//   wrong   = rosu    (gresit si bifat)
//   missed  = portocaliu (corect, dar NEbifat)
//   neutral = fara accent
const stateClasses: Record<OptionVisualState, string> = {
  neutral: "border-border bg-background",
  correct: "border-green-500 bg-green-50 dark:bg-green-950/30",
  wrong: "border-red-500 bg-red-50 dark:bg-red-950/30",
  missed: "border-orange-500 bg-orange-50 dark:bg-orange-950/30",
};

export default function AnswerOption({ option, checked, disabled, state, onToggle }: Props) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
        stateClasses[state],
        disabled && "cursor-default",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(option.id)}
      />
      <span className="text-foreground">{option.text}</span>
    </label>
  );
}
