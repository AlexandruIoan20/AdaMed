import { questionFigures, type AnswerResult, type Question } from "../types/quiz.types";

interface Props {
  question: Question;
  result: AnswerResult | null; // null = încă nerăspunsă -> panou „adormit"
}

export default function StudyPanel({ question, result }: Props) {
  if (!result) return <DormantPanel />;

  const correct = result.wasCorrect;
  const figures = questionFigures(question);

  return (
    <div className="animate-wake mx-auto flex w-full max-w-xl flex-col gap-7">
      {/* Verdict — momentul adevărului */}
      <div className="animate-rise space-y-2">
        <div className="flex items-center gap-3">
          <span
            className={
              "grid size-10 shrink-0 place-items-center rounded-full text-white " +
              (correct ? "bg-green-500" : "bg-destructive")
            }
            aria-hidden
          >
            {correct ? <CheckIcon /> : <CrossIcon />}
          </span>
          <h2 className="font-serif text-2xl text-foreground">
            {correct ? "Răspuns corect" : "Răspuns greșit"}
          </h2>
        </div>
        <p className="pl-13 text-sm text-muted-foreground">
          {correct
            ? "Ai bifat exact variantele corecte."
            : "Compară selecția ta cu cheia colorată din stânga."}
        </p>
      </div>

      {/* Explicația AI */}
      <section className="animate-rise-2 space-y-3 border-t border-primary/15 pt-6">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
          <SparkIcon /> Explicația AdaMed
        </p>
        {result.explanation ? (
          <p className="font-serif text-[1.02rem] leading-relaxed text-foreground/90">
            {result.explanation}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nu există încă o explicație pentru această grilă.
          </p>
        )}
      </section>

      {/* Figurile de referință — după submit, imaginile trec aici, lângă explicație */}
      {figures.length > 0 && (
        <figure className="animate-rise-2 space-y-2">
          <figcaption className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {figures.length > 1 ? "Figuri de referință" : "Figură de referință"}
          </figcaption>
          <div className="space-y-3">
            {figures.map((src, i) => (
              <div key={src} className="overflow-hidden rounded-xl border border-border bg-background">
                <img
                  src={src}
                  alt={`Figura ${i + 1} a întrebării`}
                  className="max-h-80 w-full object-contain"
                />
              </div>
            ))}
          </div>
        </figure>
      )}

      {/* Legenda culorilor — explică ce s-a colorat în stânga */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-primary/15 pt-5 text-xs text-muted-foreground">
        <Legend className="bg-green-500" label="Corect bifat" />
        <Legend className="bg-red-500" label="Bifat greșit" />
        <Legend className="bg-orange-500" label="Corect, dar omis" />
      </ul>
    </div>
  );
}

function DormantPanel() {
  return (
    <div className="mx-auto flex h-full w-full max-w-sm flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
        <BookIcon />
      </span>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Panou de studiu
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Trimite răspunsul ca să vezi de ce fiecare variantă e corectă sau greșită — cu explicația
        AdaMed și imaginile aferente.
      </p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={"size-3 rounded-[4px] " + className} aria-hidden />
      {label}
    </li>
  );
}

/* --- iconițe inline, fără dependențe --- */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}
