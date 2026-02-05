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
import { getTotalWishlist } from "@/app/(carts)/wishlist/action";

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
  const productImages = (product as any).images || (product as any).image || [];
  const productImage = productImages[0] || `${BASE_URL}/logo.png`;
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
    // Show a better error message instead of 404
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-border-primary rounded-lg shadow-sm p-8 md:p-12">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Product No Longer Available
          </h1>
          <p className="text-text-light mb-6 max-w-md mx-auto">
            This product has been removed from our inventory and is no longer available for purchase. 
            It may have been discontinued or sold out.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/shop"
              className="inline-flex items-center justify-center bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Browse All Products
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center border border-border-primary text-text-primary px-6 py-3 rounded-lg font-medium hover:bg-bg-alt transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  const randomProducts = await getRandomProducts(id);
  const wishlist = session?.user ? await getTotalWishlist() : undefined;
  
  // Get product images (could be 'images' or 'image' depending on source)
  const productImagesArray = (product as any).images || (product as any).image || [];
  
  // Transform product for SingleProduct component
  const productForComponent = {
    ...product,
    _id: product.id,
    image: productImagesArray,
    categories: (product as any).categories || [product.category], // All product types
    // Preserve discount information
    originalPrice: (product as any).originalPrice,
    discountPercentage: (product as any).discountPercentage,
    discountAmount: (product as any).discountAmount,
    offerName: (product as any).offerName,
    variants: product.variants.map((v: any, idx: number) => {
      console.log(`\n🏷️ VARIANT #${idx + 1}: "${v.name || v.color}"`);
      console.log(`   Full Name: ${v.fullName}`);
      console.log(`   Price: $${v.price}`);
      console.log(`   Inventory: ${v.inventory}`);
      console.log(`   Images (${v.images?.length || 0}):`);
      if (v.images && v.images.length > 0) {
        v.images.forEach((img: string, imgIdx: number) => {
          console.log(`      ${imgIdx + 1}. ${img?.substring(0, 80)}${img?.length > 80 ? '...' : ''}`);
        });
      } else {
        console.log(`      (No variant-specific images - will use parent images)`);
      }
      
      return {
        _id: v._id,
        priceId: v.priceId,
        color: v.color,
        name: v.name,
        fullName: v.fullName,
        images: v.images,
        price: v.price,
        inventory: v.inventory,
        sku: v.sku,
        barcode: v.barcode,
      };
    }),
  };
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
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
        image={productImagesArray[0] || `${BASE_URL}/logo.png`}
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
      
      <SingleProduct 
        product={productJSON} 
        session={session}
        wishlistString={JSON.stringify(wishlist)}
      />

      <h2 className="mt-24 mb-5 text-xl font-bold sm:text-2xl">
        YOU MIGHT ALSO LIKE...
      </h2>

      <Products products={randomProducts || []} extraClassname={"colums-mobile"} />
    </>
  );
};

export default ProductPage;
