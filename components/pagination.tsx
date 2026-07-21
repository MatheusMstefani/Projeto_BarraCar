import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  pathname,
}: {
  page: number;
  totalPages: number;
  pathname: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginação">
      {page > 1 ? (
        <Link className="button" href={`${pathname}?page=${page - 1}`}>
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span>
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link className="button" href={`${pathname}?page=${page + 1}`}>
          Próxima
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
