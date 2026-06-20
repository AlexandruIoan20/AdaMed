import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { subjectService } from "../service/subject.service";
import { quizService } from "../service/quiz.service";
import type { SubjectDetail } from "../types/quiz.types";
import { Button } from "../components/ui/button";

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    subjectService
      .get(subjectId)
      .then(setDetail)
      .catch(() => setError("Nu am putut încărca materia (sau nu ai acces)."))
      .finally(() => setLoading(false));
  }, [subjectId]);

  async function start() {
    if (!subjectId) return;
    setStarting(true);
    try {
      const session = await quizService.startSession(subjectId);
      navigate(`/quiz/${session.sessionId}`);
    } catch {
      setError("Nu am putut porni sesiunea.");
      setStarting(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Se încarcă...</div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!detail) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link to="/subjects" className="text-sm text-muted-foreground hover:underline">
        ← Înapoi la materii
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{detail.name}</h1>
        {detail.description && <p className="text-muted-foreground">{detail.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="An" value={detail.yearOfStudy ?? "—"} />
        <Metric label="Credite" value={detail.credits ?? "—"} />
        <Metric label="Total grile" value={detail.totalQuestions} />
        <Metric label="Rezolvate" value={`${detail.solvedQuestions} / ${detail.totalQuestions}`} />
      </div>

      <Button onClick={start} disabled={starting}>
        {starting ? "Se pornește..." : detail.hasActiveSession ? "Continuă grilele" : "Începe grile"}
      </Button>

      {detail.sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-foreground">Sesiunile tale</h2>
          <ul className="space-y-2">
            {detail.sessions.map((s) => (
              <li
                key={s.sessionId}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {s.status} · {s.answeredQuestions ?? 0} / {s.totalQuestions ?? 0} răspunse
                </span>
                <span className="font-medium text-foreground">
                  {s.correctAnswers ?? 0} corecte
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
