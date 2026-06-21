import { cn } from "../lib/utils";
import type { AnswerOption as AnswerOptionType } from "../types/quiz.types";

export type OptionVisualState = "neutral" | "correct" | "wrong" | "missed";

interface Props {
  option: AnswerOptionType;
  letter: string; // a, b, c... — eticheta clasică de grilă
  checked: boolean;
  disabled: boolean;
  state: OptionVisualState; // relevant doar după submit; altfel "neutral"
  onToggle: (id: string) => void;
}

// După submit (vezi plan §4.3):
//   correct = verde       (corect și bifat)
//   wrong   = roșu        (greșit și bifat)
//   missed  = portocaliu  (corect, dar NEbifat)
const rowAfter: Record<Exclude<OptionVisualState, "neutral">, string> = {
  correct: "border-green-500/70 bg-green-50 dark:bg-green-950/25",
  wrong: "border-red-500/70 bg-red-50 dark:bg-red-950/25",
  missed: "border-orange-500/70 bg-orange-50 dark:bg-orange-950/25",
};

const tileAfter: Record<Exclude<OptionVisualState, "neutral">, string> = {
  correct: "border-green-500 bg-green-500 text-white",
  wrong: "border-red-500 bg-red-500 text-white",
  missed: "border-orange-500 bg-orange-500 text-white",
};

export default function AnswerOption({ option, letter, checked, disabled, state, onToggle }: Props) {
  const isNeutral = state === "neutral";

  const rowCls = isNeutral
    ? checked
      ? "border-primary/60 bg-accent/50"
      : "border-border bg-card hover:border-primary/45 hover:bg-accent/35"
    : rowAfter[state];

  const tileCls = isNeutral
    ? checked
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground group-hover/opt:border-primary/45 group-hover/opt:text-foreground"
    : tileAfter[state];

  return (
    <label
      className={cn(
        "group/opt flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors sm:gap-4 sm:p-4",
        "focus-within:ring-2 focus-within:ring-ring/50",
        disabled ? "cursor-default" : "cursor-pointer",
        rowCls,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(option.id)}
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border text-sm font-semibold uppercase transition-colors",
          tileCls,
        )}
      >
        {letter}
      </span>

      <span className="min-w-0 flex-1 space-y-2 pt-0.5">
        <span className="block text-[0.95rem] leading-relaxed text-foreground">{option.text}</span>
        {option.imageUrl && (
          <img
            src={option.imageUrl}
            alt={`Varianta ${letter}`}
            className="max-h-40 w-auto rounded-lg border border-border object-contain"
          />
        )}
      </span>
    </label>
  );
}
