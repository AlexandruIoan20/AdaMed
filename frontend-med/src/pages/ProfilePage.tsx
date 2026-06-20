import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { facultyService } from "../service/faculty.service";

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

const roleLabels: Record<string, string> = {
  USER: "Student",
  ADMIN: "Administrator",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [facultyName, setFacultyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    facultyService
      .list()
      .then((faculties) => {
        const match = faculties.find((f) => f.id === user.facultyId);
        setFacultyName(match?.name ?? null);
      })
      .catch(() => setFacultyName(null));
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-5xl px-6 py-8 lg:px-12 lg:py-12">
      {/* Antet pagină */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950">
          Profilul meu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datele contului tău AdaMed.
        </p>
      </header>

      {/* Bandă de identitate */}
      <div className="flex flex-col gap-4 border-b border-emerald-100 pb-8 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="grid size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-2xl font-semibold text-emerald-700 ring-1 ring-emerald-200"
        >
          {getInitials(user.firstName, user.lastName)}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-emerald-950">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
        <span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 sm:ml-auto sm:self-center">
          {roleLabels[user.role] ?? user.role}
        </span>
      </div>

      {/* Secțiuni stil setări: etichetă la stânga, câmpuri la dreapta */}
      <Section
        title="Date personale"
        description="Identitatea ta în platformă."
      >
        <Field label="Prenume" value={user.firstName} />
        <Field label="Nume" value={user.lastName} />
        <Field label="Nume utilizator" value={`@${user.username}`} />
        <Field label="Email" value={user.email} />
      </Section>

      <Section
        title="Studii"
        description="Facultatea și anul pentru care primești grile."
      >
        <Field label="Facultate" value={facultyName ?? "—"} />
        <Field label="An de studiu" value={`Anul ${user.yearOfStudy}`} />
        <Field label="Rol" value={roleLabels[user.role] ?? user.role} />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-x-12 gap-y-6 border-b border-emerald-100 py-8 last:border-b-0 lg:grid-cols-[16rem_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium text-emerald-950">
        {value}
      </dd>
    </div>
  );
}
