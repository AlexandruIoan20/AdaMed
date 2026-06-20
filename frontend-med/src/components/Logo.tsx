import { cn } from "@/lib/utils";

/**
 * Marca AdaMed: o linie de puls (ECG) care se transformă într-o bifă —
 * „medical" + „răspuns corect", esența unei platforme de grile medicale.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 shadow-sm shadow-emerald-700/30 ring-1 ring-inset ring-white/25",
        className,
      )}
    >
      {/* reflexie subtilă în colțul stânga-sus */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 -left-3 size-8 rounded-full bg-white/25 blur-md"
      />
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative size-6 text-white"
        aria-hidden="true"
      >
        <path d="M4 17H8L10.5 11L13 20L16 16L20 23L28 9" />
      </svg>
    </span>
  );
}
