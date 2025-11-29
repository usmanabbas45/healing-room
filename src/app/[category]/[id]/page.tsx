import { SingleProduct } from "@/components/products/SingleProduct";
import { Products } from "@/components/products/Products";
import { getProduct, getRandomProducts } from "@/app/actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import { Suspense } from "react";
import ProductSkeleton from "@/components/skeletons/ProductSkeleton";
import SingleProductSkeleton from "@/components/skeletons/SingleProductSkeleton";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.id);
  
  if (!product) {
    return {
      title: "Product Not Found | Healing Room",
    };
  }
  
  const capitalizedName = capitalizeFirstLetter(product.name);

  return {
    title: `${capitalizedName} | Healing Room`,
    description: product.description,
  };
}

const ProductPage = async ({ params }: Props) => (
  <section className="pt-14">
    <Suspense
      fallback={
        <div>
          <SingleProductSkeleton />
          <h2 className="mt-24 mb-5 text-xl font-bold sm:text-2xl">
            YOU MIGHT ALSO LIKE...
          </h2>
          <ProductSkeleton
            extraClassname={"colums-mobile"}
            numberProducts={6}
          />
        </div>
      }
    >
      <AllProducts id={params.id} />
    </Suspense>
  </section>
);

const AllProducts = async ({ id }: { id: string }) => {
  const session: Session | null = await getServerSession(authOptions);
  const product = await getProduct(id);
  
  if (!product) {
    notFound();
  }
  
  const randomProducts = await getRandomProducts(id);
  
  // Transform product for SingleProduct component
  const productForComponent = {
    ...product,
    _id: product.id,
    image: product.images,
    variants: product.variants.map((v: { priceId: string; color: string; images: string[] }) => ({
      priceId: v.priceId,
      color: v.color,
      images: v.images,
    })),
  };
  
  const productJSON = JSON.stringify(productForComponent);

  return (
    <>
      <SingleProduct product={productJSON} session={session} />

      <h2 className="mt-24 mb-5 text-xl font-bold sm:text-2xl">
        YOU MIGHT ALSO LIKE...
      </h2>

      <Products products={randomProducts || []} extraClassname={"colums-mobile"} />
    </>
  );
};

export default ProductPage;
