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
import { Metadata } from "next";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://healingroomsixnations.ca';

type Props = {
  params: {
    id: string;
    category: string;
  };
};

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Strip HTML tags from description
const stripHtml = (html: string) => {
  return html?.replace(/<[^>]*>/g, '').trim() || '';
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  
  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    };
  }
  
  const capitalizedName = capitalizeFirstLetter(product.name);
  const cleanDescription = stripHtml(product.description || '').slice(0, 160);
  const productUrl = `${BASE_URL}/${params.category}/${params.id}`;
  const productImage = product.images?.[0] || `${BASE_URL}/logo.png`;
  const productBrand = (product as { brand?: string }).brand || 'Healing Room';

  return {
    title: capitalizedName,
    description: cleanDescription || `Shop ${capitalizedName} at Healing Room Six Nations. Premium quality, lab-tested products.`,
    keywords: [
      product.name,
      product.category || 'cannabis',
      productBrand,
      'Six Nations dispensary',
      'buy cannabis',
    ],
    openGraph: {
      title: `${capitalizedName} | Healing Room Six Nations`,
      description: cleanDescription || `Shop ${capitalizedName} at Healing Room Six Nations.`,
      url: productUrl,
      type: 'website',
      images: productImage ? [
        {
          url: productImage,
          width: 500,
          height: 500,
          alt: capitalizedName,
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${capitalizedName} | Healing Room`,
      description: cleanDescription || `Shop ${capitalizedName} at Healing Room.`,
      images: productImage ? [productImage] : undefined,
    },
    alternates: {
      canonical: productUrl,
    },
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
      <AllProducts id={params.id} category={params.category} />
    </Suspense>
  </section>
);

const AllProducts = async ({ id, category }: { id: string; category: string }) => {
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
  
  // Determine availability
  const totalInventory = product.variants?.reduce((sum: number, v: { inventory?: number }) => sum + (v.inventory || 0), 0) || 0;
  const availability = totalInventory > 0 ? 'InStock' : 'OutOfStock';
  
  // Clean description for JSON-LD
  const cleanDescription = product.description?.replace(/<[^>]*>/g, '').trim() || product.name;
  
  // Type-safe access to optional fields
  const productData = product as { sku?: string; brand?: string; category?: string; price?: number };

  return (
    <>
      {/* Product JSON-LD for rich snippets */}
      <ProductJsonLd
        name={product.name}
        description={cleanDescription.slice(0, 500)}
        image={product.images?.[0] || `${BASE_URL}/logo.png`}
        price={productData.price || 0}
        currency="CAD"
        availability={availability as 'InStock' | 'OutOfStock'}
        sku={productData.sku}
        brand={productData.brand}
        category={productData.category}
      />
      
      {/* Breadcrumb JSON-LD */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Shop', url: `${BASE_URL}/shop` },
          { name: capitalizeFirstLetter(category), url: `${BASE_URL}/shop?type=${category}` },
          { name: product.name, url: `${BASE_URL}/${category}/${id}` },
        ]}
      />
      
      <SingleProduct product={productJSON} session={session} />

      <h2 className="mt-24 mb-5 text-xl font-bold sm:text-2xl">
        YOU MIGHT ALSO LIKE...
      </h2>

      <Products products={randomProducts || []} extraClassname={"colums-mobile"} />
    </>
  );
};

export default ProductPage;
