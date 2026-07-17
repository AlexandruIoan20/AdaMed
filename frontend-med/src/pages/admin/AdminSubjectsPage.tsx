import { useEffect, useState } from "react";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AdminSubject } from "../../types/admin.types";
import { Button } from "../../components/ui/button";
import Modal from "../../components/admin/Modal";
import Pagination from "../../components/admin/Pagination";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

const PAGE_SIZE = 20;

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<AdminSubject | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminService
      .listSubjects(page, PAGE_SIZE, search)
      .then((res) => {
        setSubjects(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca materiile.")))
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

  function openEdit(s: AdminSubject) {
    setEditing(s);
    setCreating(false);
    setName(s.name);
    setDescription(s.description ?? "");
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
        await adminService.updateSubject(editing.id, payload);
      } else {
        await adminService.createSubject(payload);
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Nu am putut salva materia."));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await adminService.deleteSubject(toDelete.id);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Nu am putut șterge materia."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Materii</h1>
        <Button size="lg" onClick={openCreate}>Adaugă materie</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Catalogul global de materii. O materie poate fi folosită la mai multe facultăți; grilele aparțin fiecărei facultăți în parte.
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          load();
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după nume..."
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
        />
        <Button type="submit" variant="outline" size="lg">Caută</Button>
      </form>

      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Se încarcă...</p>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{s.name}</h2>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Folosită în {s.facultyCount} {s.facultyCount === 1 ? "facultate" : "facultăți"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Editează</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setToDelete(s); setDeleteError(null); }}>Șterge</Button>
                </div>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-muted-foreground">Nicio materie în catalog.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />

      <Modal open={creating || editing !== null} title={editing ? "Editează materia" : "Adaugă materie"} onClose={closeForm}>
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
        title="Ștergi materia din catalog?"
        error={deleteError}
        description={toDelete && (
          <>
            Vei șterge materia <strong>{toDelete.name}</strong> din catalog. Se vor șterge automat cele{" "}
            {toDelete.facultyCount} {toDelete.facultyCount === 1 ? "legătură cu o facultate" : "legături cu facultăți"} și
            toate grilele lor (cu răspunsuri și imagini), din toate facultățile. Acțiunea este ireversibilă.
          </>
        )}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
