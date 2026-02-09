import Link from "next/link";
import { Images } from "./Images";
import { EnrichedProducts } from "@/types/types";
import { Wishlists, getTotalWishlist } from "@/app/(carts)/wishlist/action";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import WishlistButton from "../cart/WishlistButton";
import DeleteButton from "../cart/DeleteButton";
import ProductCartInfo from "../cart/ProductCartInfo";

export const Products = async ({
  products,
  extraClassname = "",
}: {
  products: EnrichedProducts[];
  extraClassname: string;
}) => {
  const session: Session | null = await getServerSession(authOptions);
  const hasMissingQuantity = products.some((product) => !product.quantity);
  const wishlist =
    hasMissingQuantity && session?.user ? await getTotalWishlist() : undefined;

  const gridClassname = [
    "grid gap-x-3.5 gap-y-6 sm:gap-y-9",
    extraClassname === "colums-mobile" && "grid-cols-auto-fill-110",
    extraClassname === "cart-ord-mobile" && "grid-cols-1",
    "sm:grid-cols-auto-fill-250",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClassname}>
      {products.map((product, index) => {
        const {
          _id,
          category,
          quantity,
          productId,
          image,
          name,
          price,
          purchased,
        } = product;
        const isAvailable = (product as any).isAvailable !== false;
        const productLink = `/${category}/${quantity ? productId : _id}`;
        const containerClassname = [
          "flex justify-between border border-solid border-border-primary rounded-md overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow",
          extraClassname === "cart-ord-mobile"
            ? "flex-row sm:flex-col"
            : "flex-col",
          !isAvailable && "opacity-75",
        ]
          .filter(Boolean)
          .join(" ");
        const linkClassname =
          extraClassname === "cart-ord-mobile"
            ? "w-6/12 sm:w-full hover:scale-105 transition-all"
            : "hover:scale-105 transition-all";
        const infoClassname = [
          extraClassname === "cart-ord-mobile" ? "w-6/12 sm:w-full" : "",
          "flex justify-between flex-col gap-2.5 p-3.5 bg-bg-alt z-10",
        ]
          .filter(Boolean)
          .join(" ");

        const hasDiscount = product.originalPrice && product.originalPrice > price;
        
        return (
          <div className={containerClassname} key={index}>
            {isAvailable ? (
              <Link href={productLink} className={`${linkClassname} relative`}>
                {/* Discount Badge */}
                {hasDiscount && product.discountPercentage && (
                  <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                    {product.discountPercentage}% OFF
                  </div>
                )}
                <Images
                  image={image}
                  name={name}
                  width={280}
                  height={425}
                  priority={index === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1154px) 33vw, (max-width: 1536px) 25vw, 20vw"
                />
              </Link>
            ) : (
              <div className={`${linkClassname} relative`}>
                {/* Unavailable Overlay */}
                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="bg-red-600 text-white text-sm font-bold px-3 py-2 rounded-md shadow-lg">
                      NO LONGER AVAILABLE
                    </div>
                  </div>
                </div>
                <Images
                  image={image}
                  name={name}
                  width={280}
                  height={425}
                  priority={index === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1154px) 33vw, (max-width: 1536px) 25vw, 20vw"
                />
              </div>
            )}
            <div className={infoClassname}>
              <div className="flex justify-between w-full">
                {isAvailable ? (
                  <Link href={productLink} className="w-10/12 group/tooltip relative">
                    <h2 className="text-sm font-semibold truncate text-text-primary">{name}</h2>
                    {/* Show variant/size label if product has multiple sizes */}
                    {(product as any).variants?.length > 1 && (product as any).size && (product as any).size !== 'Default' && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {(product as any).size}
                      </p>
                    )}
                    <span className="absolute left-0 -top-10 z-50 hidden group-hover/tooltip:block bg-text-primary text-white text-xs px-3 py-2 rounded-md shadow-lg whitespace-normal max-w-[250px] pointer-events-none">
                      {name}
                      <span className="absolute left-4 top-full border-4 border-transparent border-t-text-primary"></span>
                    </span>
                  </Link>
                ) : (
                  <div className="w-10/12">
                    <h2 className="text-sm font-semibold truncate text-text-muted line-through">{name}</h2>
                    <p className="text-xs text-red-600 font-medium mt-0.5">Out of stock</p>
                  </div>
                )}
                {quantity ? (
                  purchased ? (
                    quantity > 1 && <span className="text-sm text-text-light">{quantity}</span>
                  ) : (
                    <DeleteButton product={product} />
                  )
                ) : (
                  <WishlistButton
                    session={session}
                    productId={JSON.stringify(_id)}
                    wishlistString={JSON.stringify(wishlist)}
                  />
                )}
              </div>
              {!purchased && isAvailable && (
                <div className="flex flex-col gap-1">
                  {hasDiscount && product.originalPrice ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-600">
                          ${quantity ? (price * quantity).toFixed(2) : price.toFixed(2)}
                        </span>
                        <span className="text-xs text-text-muted line-through">
                          ${quantity ? (product.originalPrice * quantity).toFixed(2) : product.originalPrice.toFixed(2)}
                        </span>
                      </div>
                      {product.offerName && (
                        <span className="text-xs text-green-600 font-medium">
                          {product.offerName}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="text-sm font-medium text-primary">
                      ${quantity ? (price * quantity).toFixed(2) : price.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              {!isAvailable && (
                <div className="text-xs text-text-muted">
                  This product has been removed from our inventory
                </div>
              )}
              {quantity > 0 && <ProductCartInfo product={product} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};
