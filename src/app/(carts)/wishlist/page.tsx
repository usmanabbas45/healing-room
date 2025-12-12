import { Products } from "@/components/products/Products";
import Link from "next/link";
import { getItems } from "./action";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Suspense } from "react";
import { Loader } from "@/components/common/Loader";

export async function generateMetadata() {
  return {
    title: "Wishlist | Healing Room",
    description: `Your wishlist at Healing Room`,
  };
}

const Wishlists = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (session?.user) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-[calc(100vh-91px)]">
            <Loader height={30} width={30} />
          </div>
        }
      >
        <ProductsWishlists session={session} />
      </Suspense>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2">
      <h1 className="mb-4 text-2xl md:text-3xl font-bold text-text-primary">Your Wishlist is Empty</h1>
      <p className="mb-4 text-text-muted text-center max-w-md">
        Sign in to save your favorite products to your wishlist.
      </p>
      <Link
        className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
        href="/login"
      >
        Sign In
      </Link>
    </section>
  );
};

const ProductsWishlists = async ({ session }: { session: Session }) => {
  const filteredWishlist = await getItems(session.user._id || "");
  const itemCount = filteredWishlist?.length || 0;

  if (filteredWishlist && filteredWishlist?.length > 0) {
    return (
      <section className="pt-4">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Your Wishlist</h1>
          <p className="text-sm text-text-muted mt-1">{itemCount} item{itemCount !== 1 ? 's' : ''} saved</p>
        </div>
        <Products
          products={filteredWishlist}
          extraClassname={"colums-mobile"}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2">
      <h1 className="mb-4 text-2xl md:text-3xl font-bold text-text-primary">Your Wishlist is Empty</h1>
      <p className="mb-4 text-text-muted text-center max-w-md">
        When you add products to your wishlist, they will appear here.
      </p>
      <Link
        className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
        href="/shop"
      >
        Start Shopping
      </Link>
    </section>
  );
};

export default Wishlists;
