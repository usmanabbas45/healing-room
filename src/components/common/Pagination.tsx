"use client";

import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
  queryParam?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  baseUrl = "/",
  queryParam = "page"
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const buildUrl = (page: number) => {
    if (baseUrl.includes('?')) {
      return `${baseUrl}&${queryParam}=${page}`;
    }
    return `${baseUrl}?${queryParam}=${page}`;
  };

  return (
    <nav className="flex justify-center items-center gap-2 mt-10 mb-8">
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-4 py-2 text-sm border border-border-primary rounded-md hover:bg-bg-alt transition-colors"
        >
          ← Prev
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm border border-border-primary rounded-md text-text-muted cursor-not-allowed">
          ← Prev
        </span>
      )}

      <div className="flex gap-1">
        {getPageNumbers().map((pageNum, idx) => (
          pageNum === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-3 py-2 text-text-muted">...</span>
          ) : (
            <Link
              key={pageNum}
              href={buildUrl(pageNum as number)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                currentPage === pageNum
                  ? 'bg-primary text-white'
                  : 'border border-border-primary hover:bg-bg-alt'
              }`}
            >
              {pageNum}
            </Link>
          )
        ))}
      </div>

      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-4 py-2 text-sm border border-border-primary rounded-md hover:bg-bg-alt transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm border border-border-primary rounded-md text-text-muted cursor-not-allowed">
          Next →
        </span>
      )}
    </nav>
  );
}

