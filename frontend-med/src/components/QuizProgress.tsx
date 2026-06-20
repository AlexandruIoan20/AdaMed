interface Props {
  answered: number;
  total: number;
}

export default function QuizProgress({ answered, total }: Props) {
  const current = Math.min(answered + 1, total);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          Grila {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
