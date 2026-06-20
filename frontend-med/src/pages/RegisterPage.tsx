import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { registerSchema, type RegisterFormValues } from "../schemas/auth.schema";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../service/api";
import { facultyService } from "../service/faculty.service";
import type { Faculty } from "../types/faculty.types";
import type { RegisterPayload } from "../types/auth.types";
import { Button } from "../components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "text-sm font-medium text-foreground";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultiesLoading, setFacultiesLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues, unknown, RegisterPayload>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    facultyService
      .list()
      .then(setFaculties)
      .catch(() => setFaculties([]))
      .finally(() => setFacultiesLoading(false));
  }, []);

  async function onSubmit(values: RegisterPayload) {
    setServerError(null);
    try {
      await registerUser(values);
      navigate("/");
    } catch (err) {
      setServerError(
        err instanceof ApiError && typeof err.body === "object" && err.body !== null && "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "Eroare la înregistrare",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Cont nou</h1>
          <p className="text-sm text-muted-foreground">Creează-ți contul de student AdaMed</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className={labelClass}>
              Prenume
            </label>
            <input id="firstName" {...register("firstName")} className={inputClass} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lastName" className={labelClass}>
              Nume
            </label>
            <input id="lastName" {...register("lastName")} className={inputClass} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <input id="username" {...register("username")} className={inputClass} />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" type="email" autoComplete="email" {...register("email")} className={inputClass} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={labelClass}>
            Parolă
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className={inputClass}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="facultyId" className={labelClass}>
              Facultate
            </label>
            <select
              id="facultyId"
              {...register("facultyId")}
              disabled={facultiesLoading || faculties.length === 0}
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                {facultiesLoading ? "Se încarcă..." : "Selectează facultatea"}
              </option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
            {errors.facultyId && <p className="text-sm text-destructive">{errors.facultyId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="yearOfStudy" className={labelClass}>
              An de studiu
            </label>
            <input id="yearOfStudy" type="number" min={1} max={6} {...register("yearOfStudy")} className={inputClass} />
            {errors.yearOfStudy && <p className="text-sm text-destructive">{errors.yearOfStudy.message}</p>}
          </div>
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Se procesează..." : "Creează cont"}
        </Button>
      </form>
    </div>
  );
}
