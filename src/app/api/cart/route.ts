import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import prisma from "@/libs/prisma";

// GET /api/cart - Get current user's cart
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        cart: {
          include: {
            items: true,
          },
        },
      },
    });
    
    if (!user?.cart) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }
    
    return NextResponse.json({
      items: user.cart.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        variantId: item.variantId,
      })),
    });
    
  } catch (error) {
    console.error("Get cart error:", error);
    return NextResponse.json({ error: "Failed to get cart" }, { status: 500 });
  }
}

