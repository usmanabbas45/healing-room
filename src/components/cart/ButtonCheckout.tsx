"use client";

import { ItemDocument } from "@/types/types";
import { toast } from "sonner";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ButtonCheckoutProps {
  cartWithProducts: ItemDocument[];
  session: Session | null;
}

const ButtonCheckout = ({ cartWithProducts, session }: ButtonCheckoutProps) => {
  const router = useRouter();

  const handleCheckout = () => {
    if (!session) {
      toast.error("Please sign in to checkout");
      router.push("/login?redirect=/checkout");
      return;
    }

    if (cartWithProducts.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    router.push("/checkout");
  };

  return (
    <button
      onClick={handleCheckout}
      className="w-full text-sm font-medium p-3 h-full bg-primary text-white rounded-lg transition-all hover:bg-primary-dark flex items-center justify-center"
    >
      Proceed to Checkout
    </button>
  );
};

export default ButtonCheckout;
