import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AnswerPayload, QuestionImage } from "../../types/admin.types";
import { Button } from "../../components/ui/button";

interface AnswerRow {
  id: string | null;
  text: string;
  isCorrect: boolean;
  imageUrl: string | null;
}

function emptyAnswer(): AnswerRow {
  return { id: null, text: "", isCorrect: false, imageUrl: null };
}

export default function AdminQuestionEditorPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEdit = Boolean(questionId);
  const facultySubjectId = searchParams.get("facultySubjectId");

  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [answers, setAnswers] = useState<AnswerRow[]>([emptyAnswer(), emptyAnswer()]);
  const [images, setImages] = useState<QuestionImage[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    setLoading(true);
    adminService
      .getQuestion(questionId)
      .then((q) => {
        setText(q.text);
        setExplanation(q.explanation ?? "");
        setAnswers(q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl })));
        setImages(q.images);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca grila.")))
      .finally(() => setLoading(false));
  }, [questionId]);

  function updateAnswer(index: number, patch: Partial<AnswerRow>) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAnswer() {
    setAnswers((prev) => [...prev, emptyAnswer()]);
  }

  function removeAnswer(index: number) {
    setAnswers((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!text.trim()) return "Textul grilei este obligatoriu.";
    const filled = answers.filter((a) => a.text.trim());
    if (filled.length < 2) return "Grila trebuie să aibă cel puțin 2 răspunsuri.";
    if (!filled.some((a) => a.isCorrect)) return "Grila trebuie să aibă cel puțin un răspuns corect.";
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSaving(true);

    const payload = {
      text: text.trim(),
      explanation: explanation.trim() || null,
      answers: answers
        .filter((a) => a.text.trim())
        .map<AnswerPayload>((a, i) => ({
          id: a.id,
          text: a.text.trim(),
          isCorrect: a.isCorrect,
          imageUrl: a.imageUrl,
          position: i,
        })),
    };

    try {
      if (isEdit && questionId) {
        await adminService.updateQuestion(questionId, payload);
        navigate(-1);
      } else if (facultySubjectId) {
        const created = await adminService.createQuestion(facultySubjectId, payload);
        // Trecem în modul editare ca să putem adăuga imagini.
        navigate(`/admin/questions/${created.id}`, { replace: true });
      } else {
        setError("Lipsește materia (facultySubjectId).");
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Nu am putut salva grila."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !questionId) return;
    try {
      const img = await adminService.uploadImage(questionId, file);
      setImages((prev) => [...prev, img]);
    } catch (err) {
      setError(apiErrorMessage(err, "Nu am putut încărca imaginea."));
    } finally {
      e.target.value = "";
    }
  }

  async function deleteImage(imageId: string) {
    if (!questionId) return;
    try {
      await adminService.deleteImage(questionId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(apiErrorMessage(err, "Nu am putut șterge imaginea."));
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:underline">← Înapoi</button>
      <h1 className="text-2xl font-semibold text-foreground">{isEdit ? "Editează grila" : "Adaugă grilă"}</h1>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <label className="block">
        <span className="text-sm font-medium text-foreground">Întrebare</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-foreground">Explicație (opțional)</span>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Răspunsuri</span>
          <Button variant="outline" size="sm" onClick={addAnswer}>+ Adaugă răspuns</Button>
        </div>
        {answers.map((a, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={a.isCorrect} onChange={(e) => updateAnswer(i, { isCorrect: e.target.checked })} />
              corect
            </label>
            <input
              value={a.text}
              onChange={(e) => updateAnswer(i, { text: e.target.value })}
              placeholder={`Răspuns ${i + 1}`}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            />
            <Button variant="ghost" size="icon-sm" onClick={() => removeAnswer(i)} aria-label="Șterge răspuns">✕</Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="lg" onClick={() => navigate(-1)}>Anulează</Button>
        <Button size="lg" onClick={save} disabled={saving}>{saving ? "Se salvează..." : "Salvează"}</Button>
      </div>

      {isEdit && (
        <div className="space-y-3 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">Imagini</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.imageUrl} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
                <button
                  onClick={() => deleteImage(img.id)}
                  className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-xs text-white shadow"
                  aria-label="Șterge imaginea"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" />
        </div>
      )}
    </div>
  );
}
