import { Products } from "@/components/products/Products";
import { getAllProducts } from "../actions";
import { Pagination } from "@/components/common/Pagination";

const PRODUCTS_PER_PAGE = 24;

export const metadata = {
  title: "Shop | Healing Room",
  description: "Browse our full selection of premium cannabis & tobacco products.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const currentPage = Number(searchParams.page) || 1;

  const { products, totalCount } = await getAllProducts(currentPage, PRODUCTS_PER_PAGE);

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  const startItem = totalCount > 0 ? ((currentPage - 1) * PRODUCTS_PER_PAGE) + 1 : 0;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount);

  return (
    <section className="pt-14">
      <div className="mb-8 px-4">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Shop All Products</h1>
        <p className="text-text-muted">
          Showing {startItem}-{endItem} of {totalCount} products
        </p>
      </div>
      
      <Products products={products} extraClassname="" />
      
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl="/shop" />
      )}
    </section>
  );
}

