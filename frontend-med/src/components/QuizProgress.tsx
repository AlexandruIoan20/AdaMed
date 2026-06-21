interface Props {
  answered: number;
  total: number;
}

// Bară de progres compactă, gândită pentru bara superioară a paginii de quiz.
export default function QuizProgress({ answered, total }: Props) {
  const current = Math.min(answered + 1, total);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium tabular-nums text-foreground">
        Grila {current}
        <span className="text-muted-foreground"> / {total}</span>
      </span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-40">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">{pct}%</span>
    </div>
  );
}
