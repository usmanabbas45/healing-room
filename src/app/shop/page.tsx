import { Products } from "@/components/products/Products";
import { getAllProducts, getProductTypes } from "../actions";
import { Pagination } from "@/components/common/Pagination";
import { ProductTypeFilter } from "@/components/shop/ProductTypeFilter";
import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string };
}) {
  const currentPage = Number(searchParams.page) || 1;
  const typeFilter = searchParams.type || 'all';
  
  // Fetch product types from Hikeup (cached)
  const productTypes = await getProductTypes();
  
  // Validate type filter
  const validType = productTypes.find(t => t.id === typeFilter) ? typeFilter : 'all';
  const typeName = productTypes.find(t => t.id === validType)?.name || 'All Products';

  const { products, totalCount } = await getAllProducts(currentPage, PRODUCTS_PER_PAGE, validType);

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  const startItem = totalCount > 0 ? ((currentPage - 1) * PRODUCTS_PER_PAGE) + 1 : 0;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount);
  
  // Build base URL for pagination with current filter
  const baseUrl = validType === 'all' ? '/shop' : `/shop?type=${validType}`;

  return (
    <>
      <BreadcrumbJsonLd 
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Shop', url: `${BASE_URL}/shop` },
          ...(validType !== 'all' ? [{ name: typeName, url: `${BASE_URL}/shop?type=${validType}` }] : []),
        ]} 
      />
      <section className="pt-14">
      {/* Header with title and filter */}
      <div className="mb-8 px-4">
        {/* Desktop: side by side | Mobile: stacked */}
        <div className="block md:hidden">
          {/* Mobile layout */}
          <h1 className="text-2xl font-bold text-text-primary">
            {validType === 'all' ? 'Shop All Products' : typeName}
          </h1>
          <p className="text-sm text-text-muted mt-1 mb-4">
            {totalCount > 0 
              ? `Showing ${startItem}-${endItem} of ${totalCount} products`
              : 'No products found'}
          </p>
          <ProductTypeFilter currentType={validType} productTypes={productTypes} />
        </div>
        
        <div className="hidden md:flex md:items-center md:justify-between">
          {/* Desktop layout */}
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              {validType === 'all' ? 'Shop All Products' : typeName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {totalCount > 0 
                ? `Showing ${startItem}-${endItem} of ${totalCount} products`
                : 'No products found'}
            </p>
          </div>
          <ProductTypeFilter currentType={validType} productTypes={productTypes} />
        </div>
      </div>
      
      {products.length > 0 ? (
        <>
          <Products products={products} extraClassname="" />
          
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              baseUrl={baseUrl}
            />
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No products found in this category.</p>
          <p className="text-text-light text-sm mt-2">Try selecting a different filter.</p>
        </div>
      )}
    </section>
    </>
  );
}

