import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AdminFacultyDetail, AdminFacultySubject, AdminSubject } from "../../types/admin.types";
import { Button } from "../../components/ui/button";
import Modal from "../../components/admin/Modal";
import Pagination from "../../components/admin/Pagination";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

const PAGE_SIZE = 20;

export default function AdminFacultyDetailPage() {
  const { facultyId } = useParams<{ facultyId: string }>();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState<AdminFacultyDetail | null>(null);
  const [links, setLinks] = useState<AdminFacultySubject[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Atașare / editare legătură
  const [attachOpen, setAttachOpen] = useState(false);
  const [catalog, setCatalog] = useState<AdminSubject[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [subjectId, setSubjectId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [credits, setCredits] = useState("");
  const [editingLink, setEditingLink] = useState<AdminFacultySubject | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [toDetach, setToDetach] = useState<AdminFacultySubject | null>(null);
  const [detachError, setDetachError] = useState<string | null>(null);

  function loadLinks() {
    if (!facultyId) return;
    setLoading(true);
    adminService
      .listFacultySubjects(facultyId, page, PAGE_SIZE)
      .then((res) => {
        setLinks(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca materiile.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!facultyId) return;
    adminService.getFaculty(facultyId).then(setFaculty).catch(() => {});
  }, [facultyId]);

  useEffect(loadLinks, [facultyId, page]);

  function openAttach() {
    setAttachOpen(true);
    setEditingLink(null);
    setMode("existing");
    setSubjectId("");
    setNewName("");
    setNewDescription("");
    setYearOfStudy("");
    setCredits("");
    setFormError(null);
    adminService.listSubjects(0, 200).then((res) => setCatalog(res.content)).catch(() => {});
  }

  function openEditLink(link: AdminFacultySubject) {
    setEditingLink(link);
    setAttachOpen(true);
    setYearOfStudy(link.yearOfStudy != null ? String(link.yearOfStudy) : "");
    setCredits(link.credits != null ? String(link.credits) : "");
    setFormError(null);
  }

  function closeForm() {
    setAttachOpen(false);
    setEditingLink(null);
  }

  async function save() {
    if (!facultyId) return;
    const year = yearOfStudy.trim() ? Number(yearOfStudy) : null;
    const cr = credits.trim() ? Number(credits) : null;
    try {
      if (editingLink) {
        await adminService.updateFacultySubject(editingLink.facultySubjectId, { yearOfStudy: year, credits: cr });
      } else if (mode === "existing") {
        if (!subjectId) { setFormError("Alege o materie din catalog."); return; }
        await adminService.attachSubject(facultyId, { subjectId, yearOfStudy: year, credits: cr });
      } else {
        if (!newName.trim()) { setFormError("Introdu numele materiei noi."); return; }
        await adminService.attachSubject(facultyId, {
          newSubject: { name: newName.trim(), description: newDescription.trim() || null },
          yearOfStudy: year,
          credits: cr,
        });
      }
      closeForm();
      loadLinks();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Nu am putut salva materia."));
    }
  }

  async function confirmDetach() {
    if (!toDetach) return;
    setDetachError(null);
    try {
      await adminService.detachSubject(toDetach.facultySubjectId);
      setToDetach(null);
      loadLinks();
    } catch (err) {
      setDetachError(apiErrorMessage(err, "Nu am putut șterge materia."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <Link to="/admin/faculties" className="text-sm text-muted-foreground hover:underline">← Facultăți</Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{faculty?.name ?? "Facultate"}</h1>
          <Button size="lg" onClick={openAttach}>Adaugă materie</Button>
        </div>
        {faculty?.description && <p className="mt-1 text-sm text-muted-foreground">{faculty.description}</p>}
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Se încarcă...</p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.facultySubjectId} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => navigate(`/admin/faculty-subjects/${link.facultySubjectId}`)} className="text-left">
                  <h2 className="font-semibold text-foreground hover:underline">{link.name}</h2>
                  {link.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{link.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {link.questionCount} grile
                    {link.yearOfStudy != null && ` · anul ${link.yearOfStudy}`}
                    {link.credits != null && ` · ${link.credits} credite`}
                  </p>
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditLink(link)}>Editează</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setToDetach(link); setDetachError(null); }}>Șterge</Button>
                </div>
              </div>
            </div>
          ))}
          {links.length === 0 && <p className="text-muted-foreground">Nicio materie atașată.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />

      <Modal open={attachOpen} title={editingLink ? "Editează legătura" : "Adaugă materie la facultate"} onClose={closeForm}>
        <div className="space-y-4">
          {!editingLink && (
            <>
              <div className="flex gap-2">
                <Button variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>Din catalog</Button>
                <Button variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>Materie nouă</Button>
              </div>
              {mode === "existing" ? (
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Materie</span>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                  >
                    <option value="">— alege —</option>
                    {catalog.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Nume materie</span>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Descriere</span>
                    <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
                  </label>
                </>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">An de studiu</span>
              <input type="number" value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Credite</span>
              <input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30" />
            </label>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={closeForm}>Anulează</Button>
            <Button size="lg" onClick={save}>Salvează</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toDetach !== null}
        title="Ștergi materia de la facultate?"
        error={detachError}
        description={toDetach && (
          <>
            Vei șterge <strong>{toDetach.name}</strong> de la această facultate. Se vor șterge cele {toDetach.questionCount} grile
            ale facultății pentru materie (cu răspunsuri și imagini). Materia rămâne în catalog și la celelalte facultăți.
          </>
        )}
        onConfirm={confirmDetach}
        onCancel={() => setToDetach(null)}
      />
    </div>
  );
}
