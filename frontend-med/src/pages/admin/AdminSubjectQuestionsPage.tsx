import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AdminFacultySubject, AdminQuestion } from "../../types/admin.types";
import { Button } from "../../components/ui/button";
import Pagination from "../../components/admin/Pagination";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

const PAGE_SIZE = 20;

export default function AdminSubjectQuestionsPage() {
  const { facultySubjectId } = useParams<{ facultySubjectId: string }>();
  const navigate = useNavigate();

  const [link, setLink] = useState<AdminFacultySubject | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<AdminQuestion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    if (!facultySubjectId) return;
    setLoading(true);
    adminService
      .listQuestions(facultySubjectId, page, PAGE_SIZE)
      .then((res) => {
        setQuestions(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca grilele.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!facultySubjectId) return;
    adminService.getFacultySubject(facultySubjectId).then(setLink).catch(() => {});
  }, [facultySubjectId]);

  useEffect(load, [facultySubjectId, page]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await adminService.deleteQuestion(toDelete.id);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Nu am putut șterge grila."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        {link && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Înapoi
          </button>
        )}
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Grile · {link?.name ?? ""}</h1>
          <Button size="lg" onClick={() => navigate(`/admin/questions/new?facultySubjectId=${facultySubjectId}`)}>
            Adaugă grilă
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Se încarcă...</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium text-foreground">{page * PAGE_SIZE + idx + 1}. {q.text}</h2>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/questions/${q.id}`)}>Editează</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setToDelete(q); setDeleteError(null); }}>Șterge</Button>
                </div>
              </div>

              {q.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.images.map((img) => (
                    <img key={img.id} src={img.imageUrl} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  ))}
                </div>
              )}

              <ul className="mt-3 space-y-1">
                {q.answers.map((a) => (
                  <li
                    key={a.id}
                    className={
                      a.isCorrect
                        ? "rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800"
                        : "rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
                    }
                  >
                    {a.isCorrect ? "✓ " : "• "}{a.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {questions.length === 0 && <p className="text-muted-foreground">Nicio grilă încă.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Ștergi grila?"
        error={deleteError}
        description={toDelete && (
          <>Vei șterge grila și cele {toDelete.answers.length} răspunsuri + {toDelete.images.length} imagini. Acțiunea este ireversibilă.</>
        )}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
