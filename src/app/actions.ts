"use server";

import prisma from "@/libs/prisma";

// Transform Prisma product to EnrichedProducts format
function transformProduct(product: any) {
  return {
    _id: product.id,
    id: product.id,
    productId: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    sizes: product.sizes,
    image: product.images,
    variants: product.variants?.map((v: any) => ({
      priceId: v.priceId,
      color: v.color,
      images: v.images,
    })) || [],
    purchased: false,
    color: product.variants?.[0]?.color || "",
    size: product.sizes?.[0] || "",
    quantity: 0,
    variantId: product.variants?.[0]?.priceId || "",
  };
}

export const getAllProducts = async () => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
      },
    });
    return products.map(transformProduct);
  } catch (error) {
    console.error("Error getting products:", error);
    throw new Error("Failed to fetch products");
  }
};

export const getCategoryProducts = async (category: string) => {
  try {
    const products = await prisma.product.findMany({
      where: { category },
      include: {
        variants: true,
      },
    });
    return products.map(transformProduct);
  } catch (error) {
    console.error("Error getting products:", error);
    throw new Error("Failed to fetch category products");
  }
};

export const getRandomProducts = async (productId: string) => {
  try {
    const allProducts = await prisma.product.findMany({
      where: {
        NOT: { id: productId },
      },
      include: {
        variants: true,
      },
    });

    // Shuffle and take 6
    const shuffled = allProducts.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6).map(transformProduct);
  } catch (error) {
    console.error("Error getting products:", error);
    throw new Error("Failed to fetch random products");
  }
};

export const getProduct = async (id: string) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });
    return product;
  } catch (error) {
    console.error("Error getting product:", error);
    return null;
  }
};

export const searchProducts = async (query: string) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        variants: true,
      },
    });
    return products;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
};
