import { Products } from "@/components/products/Products";
import { searchProducts } from "../actions";
import { Pagination } from "@/components/common/Pagination";
import { Suspense } from "react";
import ProductSkeleton from "@/components/skeletons/ProductSkeleton";

interface SearchProps {
  searchParams: { q?: string; page?: string };
}

const PRODUCTS_PER_PAGE = 24;

export default async function Search({ searchParams }: SearchProps) {
  const query = searchParams.q || "";
  const currentPage = Number(searchParams.page) || 1;
  
  if (!query.trim()) {
    return (
      <section className="pt-14 px-4">
        <h3 className="text-sm text-center text-text-muted">
          Enter a search term to find products
        </h3>
      </section>
    );
  }

  const allResults = await searchProducts(query);
  
  // Client-side pagination of search results
  const totalCount = allResults.length;
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedResults = allResults.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

  if (paginatedResults.length === 0) {
    return (
      <section className="pt-14 px-4">
        <h3 className="text-sm text-center text-text-muted">
          No products found for &quot;{query}&quot;
        </h3>
      </section>
    );
  }

  return (
    <section className="pt-14">
      <div className="flex justify-between items-center mb-6 px-4">
        <p className="text-text-muted text-sm">
          {totalCount} result{totalCount !== 1 ? 's' : ''} for &quot;{query}&quot;
          {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
        </p>
      </div>
      
      <Suspense fallback={<ProductSkeleton extraClassname="" numberProducts={PRODUCTS_PER_PAGE} />}>
        <Products products={paginatedResults} extraClassname="" />
      </Suspense>
      
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl={`/search?q=${encodeURIComponent(query)}`}
        />
      )}
    </section>
  );
}
