import { Suspense } from "react";
import { Products } from "../components/products/Products";
import { getAllProducts, getProductCount } from "./actions";
import ProductSkeleton from "@/components/skeletons/ProductSkeleton";
import { Pagination } from "@/components/common/Pagination";

const PRODUCTS_PER_PAGE = 24;

const Home = async ({
  searchParams,
}: {
  searchParams: { page?: string };
}) => {
  const currentPage = Number(searchParams.page) || 1;

  return (
    <section className="pt-14">
      <Suspense
        fallback={<ProductSkeleton extraClassname="" numberProducts={PRODUCTS_PER_PAGE} />}
      >
        <AllProducts page={currentPage} />
      </Suspense>
    </section>
  );
};

const AllProducts = async ({ page }: { page: number }) => {
  const [products, totalCount] = await Promise.all([
    getAllProducts(page, PRODUCTS_PER_PAGE),
    getProductCount(),
  ]);

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  return (
    <>
      <div className="flex justify-between items-center mb-6 px-4">
        <p className="text-text-muted text-sm">
          Showing {((page - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(page * PRODUCTS_PER_PAGE, totalCount)} of {totalCount} products
        </p>
      </div>
      
      <Products products={products} extraClassname="" />
      
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/" />
      )}
    </>
  );
};

export default Home;
