import { useEffect, useState } from "react";
import { adminService } from "../../service/admin.service";
import { apiErrorMessage } from "../../service/api";
import type { AdminUser } from "../../types/admin.types";
import type { UserRole } from "../../types/auth.types";
import { Button } from "../../components/ui/button";
import Modal from "../../components/admin/Modal";
import Pagination from "../../components/admin/Pagination";

const PAGE_SIZE = 20;
const ROLES: UserRole[] = ["USER", "ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("USER");
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminService
      .listUsers(page, PAGE_SIZE, search)
      .then((res) => {
        setUsers(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(apiErrorMessage(err, "Nu am putut încărca utilizatorii.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  function openEdit(u: AdminUser) {
    setEditing(u);
    setFormUsername(u.username);
    setFormRole(u.role);
    setFormError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await adminService.updateUser(editing.id, { username: formUsername.trim(), role: formRole });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Nu am putut salva modificările."));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Utilizatori</h1>

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
          placeholder="Caută după username sau email..."
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
        />
        <Button type="submit" variant="outline" size="lg">Caută</Button>
      </form>

      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Se încarcă...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Nume</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Facultate</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">@{u.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.facultyName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={u.role === "ADMIN" ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700" : "text-muted-foreground"}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editează</Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Niciun utilizator.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />

      <Modal open={editing !== null} title={`Editează utilizatorul`} onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Username</span>
            <input
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Rol</span>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {editing && (
            <p className="text-xs text-muted-foreground">
              {editing.firstName} {editing.lastName} · {editing.email} · {editing.facultyName ?? "fără facultate"} · anul {editing.yearOfStudy ?? "—"}
            </p>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={() => setEditing(null)}>Anulează</Button>
            <Button size="lg" onClick={saveEdit}>Salvează</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
