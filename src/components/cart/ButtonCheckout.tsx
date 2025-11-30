"use client";

import { ItemDocument } from "@/types/types";
import { useTransition, useCallback } from "react";
import { Loader } from "../common/Loader";
import { toast } from "sonner";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/(carts)/cart/action";

interface ButtonCheckoutProps {
  cartWithProducts: ItemDocument[];
  session: Session | null;
}

const ButtonCheckout = ({ cartWithProducts, session }: ButtonCheckoutProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCheckout = useCallback(async () => {
    if (!session) {
      toast.error("Please sign in to checkout");
      return;
    }

    if (cartWithProducts.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    startTransition(async () => {
      try {
        const result = await placeOrder(cartWithProducts);

        if (!result.success) {
          if (result.errors && result.errors.length > 0) {
            toast.error("Some items are unavailable", {
              description: result.errors.join("\n"),
              duration: 8000,
            });
          } else {
            toast.error(result.error || "Failed to place order");
          }
          return;
        }

        toast.success("Order placed successfully!");
        router.push(`/orders/${result.orderId}`);
      } catch (error) {
        console.error("Checkout error:", error);
        toast.error("An error occurred. Please try again.");
      }
    });
  }, [session, cartWithProducts, router]);

  return (
    <button
      onClick={handleCheckout}
      disabled={isPending}
      className="w-full text-sm font-medium p-3 h-full bg-primary text-white rounded-lg transition-all hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {isPending ? <Loader height={20} width={20} /> : "Place Order"}
    </button>
  );
};

export default ButtonCheckout;
