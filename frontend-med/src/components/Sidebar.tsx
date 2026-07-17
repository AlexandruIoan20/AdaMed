import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    to: "/subjects",
    label: "Materii",
    isActive: (p) => p.startsWith("/subjects") || p.startsWith("/quiz"),
    icon: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
  },
  {
    to: "/profile",
    label: "Profilul meu",
    isActive: (p) => p === "/profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

// Afișate doar la useri cu rol ADMIN, într-o secțiune separată de „Administrare".
const adminNavItems: NavItem[] = [
  {
    to: "/admin/users",
    label: "Utilizatori",
    isActive: (p) => p.startsWith("/admin/users"),
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    to: "/admin/faculties",
    label: "Facultăți",
    isActive: (p) =>
      p.startsWith("/admin/faculties") ||
      p.startsWith("/admin/faculty-subjects") ||
      p.startsWith("/admin/questions"),
    icon: (
      <>
        <path d="m22 10-10-5L2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" />
      </>
    ),
  },
  {
    to: "/admin/subjects",
    label: "Materii",
    isActive: (p) => p.startsWith("/admin/subjects"),
    icon: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Închide sertarul la schimbarea paginii (pe mobil)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const renderItem = (item: NavItem) => {
    const active = item.isActive(pathname);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/40",
          active
            ? "bg-emerald-50 font-medium text-emerald-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        {active && (
          <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" />
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("size-5", active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500")}
          aria-hidden="true"
        >
          {item.icon}
        </svg>
        {item.label}
      </NavLink>
    );
  };

  return (
    <>
      {/* Bară superioară (doar pe mobil) */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-emerald-100 bg-white/90 px-4 backdrop-blur-md md:hidden">
        <Link to="/subjects" className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <Wordmark />
        </Link>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Deschide meniul"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </header>

      {/* Fundal întunecat la sertarul de mobil */}
      {open && (
        <button
          type="button"
          aria-label="Închide meniul"
          className="fixed inset-0 z-40 bg-emerald-950/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bara laterală */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-emerald-100 bg-white transition-transform duration-300 md:translate-x-0",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Link
            to="/subjects"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
          >
            <Logo />
            <Wordmark />
          </Link>
        </div>

        {/* Navigare */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-xs font-medium tracking-wide text-emerald-700/60 uppercase">
            Meniu
          </p>
          {navItems.map(renderItem)}

          {user?.role === "ADMIN" && (
            <>
              <p className="px-3 pt-5 pb-2 text-xs font-medium tracking-wide text-emerald-700/60 uppercase">
                Administrare
              </p>
              {adminNavItems.map(renderItem)}
            </>
          )}
        </nav>

        {/* Cont + deconectare */}
        {user && (
          <div className="border-t border-emerald-100 p-3">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
              >
                {getInitials(user.firstName, user.lastName)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium text-emerald-950">
                  {user.firstName} {user.lastName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{user.username}
                </span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="mt-1 w-full justify-start text-muted-foreground hover:bg-red-50 hover:text-red-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Deconectare
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

function Wordmark() {
  return (
    <span className="text-lg font-semibold tracking-tight">
      <span className="text-emerald-900">Ada</span>
      <span className="text-emerald-600">Med</span>
    </span>
  );
}
