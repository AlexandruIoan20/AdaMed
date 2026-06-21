import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subjectService } from "../service/subject.service";
import type { SubjectListItem } from "../types/quiz.types";

export default function SubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    subjectService
      .list()
      .then(setSubjects)
      .catch(() => setError("Nu am putut încărca materiile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Se încarcă...</div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Materiile tale</h1>

      {subjects.length === 0 ? (
        <p className="text-muted-foreground">Nu există materii pentru facultatea ta.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <button
              key={s.subjectId}
              onClick={() => navigate(`/subjects/${s.subjectId}`)}
              className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-foreground">{s.name}</h2>
                <div className="flex shrink-0 gap-1">
                  {s.learningActiveSessionId != null && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      învățare în curs
                    </span>
                  )}
                  {s.practiceActiveSessionId != null && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      practică în curs
                    </span>
                  )}
                </div>
              </div>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Învățare {s.learningSolvedQuestions} / {s.totalQuestions} · Practică{" "}
                {s.practiceSolvedQuestions} / {s.totalQuestions}
                {s.yearOfStudy != null && ` · anul ${s.yearOfStudy}`}
                {s.credits != null && ` · ${s.credits} credite`}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
