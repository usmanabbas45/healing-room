import Link from "next/link";
import Image from "next/image";
import { getItems } from "./action";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { Suspense } from "react";
import { Loader } from "@/components/common/Loader";
import dynamic from "next/dynamic";
import { EnrichedProducts } from "@/types/types";
import DeleteButton from "@/components/cart/DeleteButton";
import ProductCartInfo from "@/components/cart/ProductCartInfo";

const ButtonCheckout = dynamic(
  () => import("../../../components/cart/ButtonCheckout"),
  {
    ssr: false,
    loading: () => (
      <p className="flex items-center justify-center w-full h-full text-sm">
        Continue
      </p>
    ),
  },
);

export async function generateMetadata() {
  return {
    title: "Cart | Healing Room",
    description: `Your shopping cart at Healing Room`,
  };
}

const CartPage = async () => {
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
        <ProductsCart session={session} />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2 px-4">
      <h1 className="mb-6 text-3xl font-bold text-text-primary">Your Cart is Empty</h1>
      <p className="mb-4 text-text-muted text-center max-w-md">
        Sign in to save products to your cart and checkout.
      </p>
      <Link
        className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
        href="/login"
      >
        Sign In
      </Link>
    </div>
  );
};

const ProductsCart = async ({ session }: { session: Session }) => {
  const filteredCart: EnrichedProducts[] | undefined = await getItems(
    session.user._id || "",
  );

  const calculateTotalPrice = (cart: EnrichedProducts[]) => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const totalItems = filteredCart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = filteredCart ? calculateTotalPrice(filteredCart) : 0;

  if (filteredCart && filteredCart.length > 0) {
    return (
      <div className="pt-8 pb-32 lg:pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
          Shopping Cart
          <span className="text-text-muted font-normal text-lg ml-2">({totalItems} items)</span>
        </h1>
        
        {/* Two-column layout on desktop */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items - Left Side */}
          <div className="flex-1 space-y-4">
            {filteredCart.map((item, index) => (
              <CartItem key={index} item={item} />
            ))}
          </div>
          
          {/* Order Summary - Right Side (Sticky on desktop) */}
          <div className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="sticky top-24 bg-white border border-border-primary rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal ({totalItems} items)</span>
                  <span className="text-text-primary font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t border-border-primary pt-3">
                  <div className="flex justify-between">
                    <span className="text-text-primary font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <ButtonCheckout session={session} cartWithProducts={filteredCart} />
            </div>
          </div>
        </div>
        
        {/* Mobile Bottom Bar */}
        <div className="fixed lg:hidden left-0 right-0 bottom-0 z-20 bg-white border-t border-border-primary shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-text-muted">Total ({totalItems} items)</p>
              <p className="text-xl font-bold text-primary">${subtotal.toFixed(2)}</p>
            </div>
            <div className="w-1/2">
              <ButtonCheckout session={session} cartWithProducts={filteredCart} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2 px-4">
      <h1 className="mb-6 text-3xl font-bold text-text-primary">Your Cart is Empty</h1>
      <p className="mb-4 text-text-muted text-center max-w-md">
        When you add products to your cart, they will appear here.
      </p>
      <Link
        className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
        href="/shop"
      >
        Start Shopping
      </Link>
    </div>
  );
};

// Horizontal Cart Item Component
const CartItem = ({ item }: { item: EnrichedProducts }) => {
  const { productId, category, image, name, price, quantity, size, color } = item;
  const productLink = `/${category}/${productId}`;
  const showVariantInfo = size !== 'Default' || color !== 'Default';
  
  return (
    <div className="flex gap-4 p-4 bg-white border border-border-primary rounded-xl hover:shadow-md transition-shadow">
      {/* Product Image */}
      <Link href={productLink} className="flex-shrink-0">
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-bg-alt">
          <Image
            src={image?.[0] || '/logo.png'}
            alt={name}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link href={productLink}>
            <h3 className="text-sm md:text-base font-semibold text-text-primary hover:text-primary transition-colors line-clamp-2">
              {name}
            </h3>
          </Link>
          {showVariantInfo && (
            <p className="text-xs text-text-muted mt-1">
              {size !== 'Default' && size}
              {size !== 'Default' && color !== 'Default' && ' • '}
              {color !== 'Default' && color}
            </p>
          )}
        </div>
        
        {/* Price - Mobile */}
        <div className="md:hidden mt-2">
          <span className="text-primary font-semibold">${(price * quantity).toFixed(2)}</span>
          {quantity > 1 && (
            <span className="text-xs text-text-muted ml-1">(${price.toFixed(2)} each)</span>
          )}
        </div>
      </div>
      
      {/* Quantity Controls */}
      <div className="flex flex-col items-end justify-between">
        <DeleteButton product={item} />
        
        <div className="flex items-center gap-3">
          {/* Price - Desktop */}
          <div className="hidden md:block text-right">
            <p className="text-primary font-semibold">${(price * quantity).toFixed(2)}</p>
            {quantity > 1 && (
              <p className="text-xs text-text-muted">${price.toFixed(2)} each</p>
            )}
          </div>
          
          {/* Quantity Buttons */}
          <ProductCartInfo product={item} />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
