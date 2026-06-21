import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { quizService } from "../service/quiz.service";
import { MODE_LABELS, type SessionResult } from "../types/quiz.types";
import { Button } from "../components/ui/button";

export default function QuizResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    quizService
      .getSession(sessionId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="p-8 text-muted-foreground">Se încarcă...</div>;
  if (!session) return <div className="p-8 text-destructive">Sesiunea nu a putut fi încărcată.</div>;

  const correct = session.correctAnswers ?? 0;
  const total = session.totalQuestions ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-md space-y-6 p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Rezultat sesiune · {MODE_LABELS[session.mode]}
      </h1>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-5xl font-bold text-foreground">
          {correct} / {total}
        </p>
        <p className="mt-2 text-muted-foreground">{pct}% răspunsuri corecte</p>
        <p className="mt-1 text-sm text-muted-foreground">Status: {session.status}</p>
      </div>

      <div className="flex justify-center gap-3">
        {session.subjectId && (
          <Link to={`/subjects/${session.subjectId}`}>
            <Button variant="outline">Înapoi la materie</Button>
          </Link>
        )}
        <Link to="/subjects">
          <Button>Toate materiile</Button>
        </Link>
      </div>
    </div>
  );
}
