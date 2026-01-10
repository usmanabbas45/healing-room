import { Products } from "@/components/products/Products";
import { getAllProducts, getProductTypes, searchProducts } from "../actions";
import { Pagination } from "@/components/common/Pagination";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Suspense } from "react";
import { Loader } from "@/components/common/Loader";

const PRODUCTS_PER_PAGE = 24;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://healingroomsixnations.ca';

export const metadata: Metadata = {
  title: "Shop Cannabis & Tobacco Products",
  description: "Browse our full selection of premium cannabis flower, pre-rolls, edibles, vapes, concentrates, and tobacco products at Healing Room Six Nations. Lab-tested quality, competitive prices.",
  keywords: [
    "buy cannabis online",
    "cannabis flower",
    "pre-rolls",
    "edibles",
    "vapes",
    "concentrates",
    "tobacco products",
    "Six Nations dispensary",
  ],
  openGraph: {
    title: "Shop Cannabis & Tobacco Products | Healing Room Six Nations",
    description: "Browse our full selection of premium cannabis and tobacco products. Lab-tested quality, expert recommendations, best prices.",
    url: `${BASE_URL}/shop`,
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/shop`,
  },
};

// Products Grid Component - Async data fetching
async function ProductsGrid({
  currentPage,
  validType,
  searchQuery,
}: {
  currentPage: number;
  validType: string;
  searchQuery: string;
}) {
  // Fetch products - either search or browse
  let products;
  let totalCount;
  
  if (searchQuery) {
    // Search with optional type filter
    const searchResults = await searchProducts(searchQuery, validType);
    products = searchResults;
    totalCount = searchResults.length;
  } else {
    // Browse by type
    const result = await getAllProducts(currentPage, PRODUCTS_PER_PAGE, validType);
    products = result.products;
    totalCount = result.totalCount;
  }

  const totalPages = searchQuery ? 1 : Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  
  // Build base URL for pagination with current filters
  const paginationParams = new URLSearchParams();
  if (validType !== 'all') paginationParams.set('type', validType);
  if (searchQuery) paginationParams.set('q', searchQuery);
  const baseUrl = `/shop${paginationParams.toString() ? `?${paginationParams.toString()}` : ''}`;

  if (products.length > 0) {
    return (
      <>
        <Products products={products} extraClassname="" />
        
        {totalPages > 1 && !searchQuery && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            baseUrl={baseUrl}
          />
        )}
      </>
    );
  }

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-text-primary text-lg font-medium">
        {searchQuery ? 'No products match your search' : 'No products found'}
      </p>
      <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
        {searchQuery 
          ? `We couldn't find any products matching "${searchQuery}". Try a different search term or browse our categories.`
          : 'Try selecting a different category or search for specific products.'}
      </p>
    </div>
  );
}

// Loading fallback for products grid
function ProductsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader height={48} width={48} />
      <p className="mt-4 text-text-muted text-sm">Loading products...</p>
    </div>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string; q?: string };
}) {
  const currentPage = Number(searchParams.page) || 1;
  const typeFilter = searchParams.type || 'all';
  const searchQuery = searchParams.q || '';
  
  // Fetch product types from Hikeup (fast, cached)
  const productTypes = await getProductTypes();
  
  // Validate type filter
  const validType = productTypes.find(t => t.id === typeFilter) ? typeFilter : 'all';
  const typeName = productTypes.find(t => t.id === validType)?.name || 'All Products';

  return (
    <>
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Shop', url: `${BASE_URL}/shop` },
          ...(validType !== 'all' ? [{ name: typeName, url: `${BASE_URL}/shop?type=${validType}` }] : []),
        ]} 
      />
      <section className="pt-4">
        {/* Page Header - Loads Immediately */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            {validType !== 'all' ? typeName : 'Shop'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Browse our selection
          </p>
        </div>
        
        {/* Shop Toolbar - Loads Immediately */}
        <ShopToolbar 
          currentType={validType}
          currentSearch={searchQuery}
          productTypes={productTypes}
          totalCount={0}
        />
      
        {/* Products Grid - Streams in with Suspense */}
        <Suspense fallback={<ProductsLoading />}>
          <ProductsGrid 
            currentPage={currentPage}
            validType={validType}
            searchQuery={searchQuery}
          />
        </Suspense>
      </section>
    </>
  );
}

