import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizService } from "../service/quiz.service";
import { MODE_LABELS, type AnswerResult, type Question, type SessionMode } from "../types/quiz.types";
import QuestionCard from "../components/QuestionCard";
import QuizProgress from "../components/QuizProgress";
import StudyPanel from "../components/StudyPanel";
import { cn } from "../lib/utils";

export default function QuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishAndGoToResult = useCallback(async () => {
    if (!sessionId) return;
    await quizService.finishSession(sessionId);
    navigate(`/quiz/${sessionId}/result`);
  }, [sessionId, navigate]);

  const loadNext = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setResult(null);
    try {
      const next = await quizService.getNextQuestion(sessionId);
      if (next === null) {
        await finishAndGoToResult();
        return;
      }
      setQuestion(next);

      console.log({ next }); 
    } catch {
      setError("Nu am putut încărca grila următoare.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, finishAndGoToResult]);

  useEffect(() => {
    if (!sessionId) return;
    quizService
      .getSession(sessionId)
      .then((s) => {
        setTotal(s.totalQuestions ?? 0);
        setAnswered(s.answeredQuestions ?? 0);
        setMode(s.mode);
      })
      .catch(() => setError("Nu am putut încărca sesiunea (sau nu îți aparține)."))
      .finally(() => loadNext());
  }, [sessionId, loadNext]);

  async function handleSubmit(selectedIds: string[]) {
    if (!sessionId || !question) return;
    setSubmitting(true);
    try {
      const res = await quizService.submitAnswer(sessionId, question.id, selectedIds);
      setResult(res);
      setAnswered((a) => a + 1);
    } catch {
      setError("Nu am putut trimite răspunsul.");
    } finally {
      setSubmitting(false);
    }
  }

  const shellHeight = "min-h-[calc(100dvh-4rem)] md:min-h-dvh";

  if (error)
    return (
      <div className={cn("grid place-items-center p-8 text-destructive", shellHeight)}>{error}</div>
    );
  if (loading && !question)
    return (
      <div className={cn("grid place-items-center p-8 text-muted-foreground", shellHeight)}>
        Se încarcă...
      </div>
    );
  if (!question) return null;

  const isLast = (result ? answered : answered + 1) >= total;
  const answeredNow = result !== null;

  return (
    <div className={cn("flex flex-col", shellHeight)}>
      {/* Bara superioară: mod + progres la stânga, ieșire la dreapta */}
      <header className="flex items-center justify-between gap-4 border-b border-border bg-background/85 px-5 py-3 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3 sm:gap-4">
          {mode && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {MODE_LABELS[mode]}
            </span>
          )}
          <QuizProgress answered={answered} total={total} />
        </div>
        <button
          onClick={finishAndGoToResult}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Termină
        </button>
      </header>

      {/* Corpul: foaia de examen (stânga) + panoul de studiu (dreapta) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <section className="overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
          <QuestionCard
            question={question}
            result={result}
            submitting={submitting}
            onSubmit={handleSubmit}
            onNext={loadNext}
            isLast={isLast}
          />
        </section>

        <aside
          className={cn(
            "overflow-y-auto border-t border-primary/15 bg-accent/40 px-5 py-8 sm:px-10 sm:py-10 lg:border-t-0 lg:border-l",
            !answeredNow && "hidden lg:block",
          )}
        >
          <StudyPanel question={question} result={result} />
        </aside>
      </div>
    </div>
  );
}
