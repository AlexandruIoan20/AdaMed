import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AdminFaculty } from "../../types/admin.types";
import { Button } from "../../components/ui/button";
import Modal from "../../components/admin/Modal";
import Pagination from "../../components/admin/Pagination";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

const PAGE_SIZE = 20;

export default function AdminFacultiesPage() {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminFaculty | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<AdminFaculty | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminService
      .listFaculties(page, PAGE_SIZE)
      .then((res) => {
        setFaculties(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca facultățile.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setName("");
    setDescription("");
    setFormError(null);
  }

  function openEdit(f: AdminFaculty) {
    setEditing(f);
    setCreating(false);
    setName(f.name);
    setDescription(f.description ?? "");
    setFormError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    const payload = { name: name.trim(), description: description.trim() || null };
    try {
      if (editing) {
        await adminService.updateFaculty(editing.id, payload);
      } else {
        await adminService.createFaculty(payload);
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Nu am putut salva facultatea."));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await adminService.deleteFaculty(toDelete.id);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Nu am putut șterge facultatea."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Facultăți</h1>
        <Button size="lg" onClick={openCreate}>Adaugă facultate</Button>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Se încarcă...</p>
      ) : (
        <div className="space-y-3">
          {faculties.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => navigate(`/admin/faculties/${f.id}`)} className="text-left">
                  <h2 className="font-semibold text-foreground hover:underline">{f.name}</h2>
                  {f.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{f.subjectCount} materii · {f.userCount} utilizatori</p>
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(f)}>Editează</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setToDelete(f); setDeleteError(null); }}>Șterge</Button>
                </div>
              </div>
            </div>
          ))}
          {faculties.length === 0 && <p className="text-muted-foreground">Nicio facultate.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />

      <Modal open={creating || editing !== null} title={editing ? "Editează facultatea" : "Adaugă facultate"} onClose={closeForm}>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Nume</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Descriere</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            />
          </label>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={closeForm}>Anulează</Button>
            <Button size="lg" onClick={save} disabled={!name.trim()}>Salvează</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Ștergi facultatea?"
        error={deleteError}
        description={toDelete && (
          <>
            Vei șterge facultatea <strong>{toDelete.name}</strong> și cele {toDelete.subjectCount} legături cu materii,
            împreună cu grilele lor (materiile din catalog rămân).
            {toDelete.userCount > 0 && (
              <> Are <strong>{toDelete.userCount} utilizatori</strong> asociați — ștergerea va fi blocată.</>
            )}
          </>
        )}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
