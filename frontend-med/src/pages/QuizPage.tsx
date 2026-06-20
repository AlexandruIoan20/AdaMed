import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizService } from "../service/quiz.service";
import type { AnswerResult, Question } from "../types/quiz.types";
import QuestionCard from "../components/QuestionCard";
import QuizProgress from "../components/QuizProgress";

export default function QuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
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

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (loading && !question) return <div className="p-8 text-muted-foreground">Se încarcă...</div>;
  if (!question) return null;

  // answered include deja grila curentă după submit; pentru "ultima" comparăm înainte de submit.
  const isLast = (result ? answered : answered + 1) >= total;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <QuizProgress answered={answered} total={total} />
      <QuestionCard
        question={question}
        result={result}
        submitting={submitting}
        onSubmit={handleSubmit}
        onNext={loadNext}
        isLast={isLast}
      />
    </div>
  );
}
