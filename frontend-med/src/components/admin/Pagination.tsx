import { Button } from "../ui/button";

interface PaginationProps {
  page: number; // index 0-based
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalElements, onPageChange }: PaginationProps) {
  if (totalElements === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <p className="text-sm text-muted-foreground">
        Pagina {page + 1} din {Math.max(totalPages, 1)} · {totalElements} în total
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Înapoi
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Înainte
        </Button>
      </div>
    </div>
  );
}
