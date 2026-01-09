"use server";

import prisma from "@/libs/prisma";
import { 
  isHikeupConnected, 
  getAllHikeupProducts,
  getHikeupProducts,
  getHikeupProductsWithMeta,
  getHikeupProduct,
  getHikeupProductsByCategory,
  getHikeupProductsByType,
  getProductTypesForFilter,
  searchHikeupProducts,
  transformHikeupProduct,
} from "@/libs/hikeup";
import { applyPriceMarkup } from "@/libs/pricing";

// Transform Prisma product to EnrichedProducts format
// Transform Hikeup product with discount data
async function transformHikeupProductWithDiscount(product: any) {
  const baseProduct = transformHikeupProduct(product);
  
  // Check if product has an active discount
  const discount = await checkProductDiscount(Number(product.id));
  
  if (discount) {
    const originalPrice = baseProduct.price;
    let finalPrice = originalPrice;
    
    // Apply discount to main product price
    if (discount.discountPercentage > 0) {
      // Percentage discount
      finalPrice = originalPrice * (1 - discount.discountPercentage / 100);
    } else if (discount.discountAmount > 0) {
      // Fixed amount discount
      finalPrice = Math.max(0, originalPrice - discount.discountAmount);
    }
    
    // Apply discount to all variant prices
    const discountedVariants = baseProduct.variants.map((variant: any) => {
      const variantOriginalPrice = variant.price;
      let variantFinalPrice = variantOriginalPrice;
      
      if (discount.discountPercentage > 0) {
        variantFinalPrice = variantOriginalPrice * (1 - discount.discountPercentage / 100);
      } else if (discount.discountAmount > 0) {
        variantFinalPrice = Math.max(0, variantOriginalPrice - discount.discountAmount);
      }
      
      return {
        ...variant,
        price: variantFinalPrice,
        originalPrice: variantOriginalPrice,
      };
    });
    
    return {
      ...baseProduct,
      price: finalPrice,
      originalPrice,
      discountPercentage: discount.discountPercentage,
      discountAmount: discount.discountAmount,
      offerName: discount.offerName,
      variants: discountedVariants,
    };
  }
  
  return baseProduct;
}

// Transform database product with discount data
async function transformProduct(product: any) {
  const markedUpPrice = applyPriceMarkup(product.price);
  
  // Check if product has an active discount
  const discount = await checkProductDiscount(Number(product.id));
  
  let finalPrice = markedUpPrice;
  let originalPrice = undefined;
  let discountPercentage = undefined;
  let discountAmount = undefined;
  let offerName = undefined;
  
  if (discount) {
    originalPrice = markedUpPrice;
    
    if (discount.discountPercentage > 0) {
      // Percentage discount
      discountPercentage = discount.discountPercentage;
      finalPrice = markedUpPrice * (1 - discount.discountPercentage / 100);
    } else if (discount.discountAmount > 0) {
      // Fixed amount discount
      discountAmount = discount.discountAmount;
      finalPrice = Math.max(0, markedUpPrice - discount.discountAmount);
    }
    
    offerName = discount.offerName;
  }
  
  return {
    _id: product.id,
    id: product.id,
    productId: product.id,
    name: product.name,
    description: product.description,
    price: finalPrice,
    originalPrice,
    discountPercentage,
    discountAmount,
    offerName,
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

export const getAllProducts = async (
  page: number = 1, 
  pageSize: number = 24,
  typeFilter: string = 'all'
) => {
  try {
    const skipCount = (page - 1) * pageSize;
    console.log(`🔍 getAllProducts called (page ${page}, size ${pageSize}, skip ${skipCount}, type ${typeFilter})`);
    
    // Check if Hikeup is connected (async - checks database)
    const connected = await isHikeupConnected();
    console.log('🔗 Hikeup connected:', connected);
    
    // Try Hikeup first if connected
    if (connected) {
      console.log('📦 Fetching products from Hikeup POS...');
      
      // Use type filter if specified
      const { products: hikeupProducts, totalCount } = typeFilter === 'all'
        ? await getHikeupProductsWithMeta(pageSize, skipCount)
        : await getHikeupProductsByType(typeFilter, pageSize, skipCount);
      
      console.log('📦 Got', hikeupProducts.length, 'products from Hikeup (total:', totalCount, ')');
      
      if (hikeupProducts.length > 0 || typeFilter !== 'all') {
        const transformed = await Promise.all(
          hikeupProducts.map(async (p) => await transformHikeupProductWithDiscount(p))
        );
        return { products: transformed, totalCount };
      }
      console.log('⚠️ No products from Hikeup, falling back to database');
    }

    // Fall back to database
    console.log('📦 Fetching products from database...');
    const whereClause = typeFilter !== 'all' 
      ? { category: { contains: typeFilter.replace(/-/g, ' '), mode: 'insensitive' as const } }
      : {};
    
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: skipCount,
        take: pageSize,
        include: {
          variants: true,
        },
      }),
      prisma.product.count({ where: whereClause }),
    ]);
    console.log('📦 Got', products.length, 'products from database');
    const transformed = await Promise.all(products.map(p => transformProduct(p)));
    return { products: transformed, totalCount };
  } catch (error) {
    console.error("❌ Error getting products:", error);
    return { products: [], totalCount: 0 };
  }
};


// Get total product count for pagination
export const getProductCount = async () => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      // Fetch just 1 product to get totalCount from Hikeup API
      console.log('🔍 Fetching product count from Hikeup...');
      const { totalCount } = await getHikeupProductsWithMeta(1, 0);
      return totalCount;
    }

    return await prisma.product.count();
  } catch (error) {
    console.error("❌ Error getting product count:", error);
    return 0;
  }
};

export const getCategoryProducts = async (category: string) => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      console.log(`📦 Fetching ${category} from Hikeup POS...`);
      const hikeupProducts = await getHikeupProductsByCategory(category);
      return await Promise.all(hikeupProducts.map(p => transformHikeupProductWithDiscount(p)));
    }

    // Fall back to database
    const products = await prisma.product.findMany({
      where: { category },
      include: {
        variants: true,
      },
    });
    return await Promise.all(products.map(p => transformProduct(p)));
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
};

export const getRandomProducts = async (productId: string) => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      // Only fetch a small batch (24 products) with a random offset instead of ALL products
      // This is much more efficient than fetching 500+ products
      const { totalCount } = await getHikeupProductsWithMeta(1, 0); // Get total count from Hikeup API
      const maxOffset = Math.max(0, totalCount - 24);
      const randomOffset = Math.floor(Math.random() * maxOffset);
      
      console.log(`📦 Fetching random products (offset: ${randomOffset}, total: ${totalCount})`);
      const { products: hikeupProducts } = await getHikeupProductsWithMeta(24, randomOffset);
      
      const filtered = hikeupProducts.filter(p => String(p.id) !== productId);
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6);
      return await Promise.all(selected.map(p => transformHikeupProductWithDiscount(p)));
    }

    // Fall back to database - also optimized
    const totalCount = await prisma.product.count();
    const randomOffset = Math.floor(Math.random() * Math.max(0, totalCount - 24));
    
    const products = await prisma.product.findMany({
      where: {
        NOT: { id: productId },
      },
      include: {
        variants: true,
      },
      skip: randomOffset,
      take: 24,
    });

    const shuffled = products.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    return await Promise.all(selected.map(p => transformProduct(p)));
  } catch (error) {
    console.error("Error getting products:", error);
  }
};

export const getProduct = async (id: string) => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      console.log(`📦 Fetching product ${id} from Hikeup POS...`);
      const hikeupProduct = await getHikeupProduct(id);
      if (hikeupProduct) {
        // Transform raw Hikeup product to website format with discount data
        return await transformHikeupProductWithDiscount(hikeupProduct);
      }
      console.log(`❌ Product ${id} not found in Hikeup`);
    }

    // Fall back to database
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });
    return await transformProduct(product);
  } catch (error) {
    console.error("Error getting product:", error);
    return null;
  }
};

export const searchProducts = async (query: string, typeFilter: string = 'all') => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      const hikeupProducts = await searchHikeupProducts(query);
      let transformedProducts = await Promise.all(
        hikeupProducts.map(p => transformHikeupProductWithDiscount(p))
      );
      
      console.log(`🔍 Search results for "${query}": ${transformedProducts.length} products`);
      
      // Apply type filter if specified
      if (typeFilter !== 'all') {
        // Log some sample categories to debug
        if (transformedProducts.length > 0) {
          console.log(`🔍 Sample categories from search results:`, 
            transformedProducts.slice(0, 5).map(p => p.category)
          );
        }
        
        const filterType = typeFilter.toLowerCase().replace(/-/g, ' ');
        console.log(`🔍 Filtering search results by type: "${filterType}"`);
        
        transformedProducts = transformedProducts.filter(p => {
          const productType = (p.category || '').toLowerCase();
          const matches = productType.includes(filterType) || filterType.includes(productType);
          return matches;
        });
        
        console.log(`🔍 After type filter: ${transformedProducts.length} products`);
      }
      
      return transformedProducts;
    }

    // Fall back to database
    const whereClause: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    };
    
    // Add type filter if specified
    if (typeFilter !== 'all') {
      whereClause.AND = {
        category: { contains: typeFilter.replace(/-/g, ' '), mode: 'insensitive' },
      };
    }
    
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        variants: true,
      },
    });
    return await Promise.all(products.map(p => transformProduct(p)));
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
};

// Check if Hikeup is connected (for UI)
export const checkHikeupConnection = async () => {
  return await isHikeupConnected();
};

// Get product types for filter dropdown
export const getProductTypes = async () => {
  try {
    const connected = await isHikeupConnected();
    if (connected) {
      return await getProductTypesForFilter();
    }
    // Fallback types if not connected
    return [
      { id: 'all', name: 'All Products', count: 0 },
    ];
  } catch (error) {
    console.error("Error getting product types:", error);
    return [{ id: 'all', name: 'All Products', count: 0 }];
  }
};
// Get active offers/deals from Hikeup
export const getActiveOffers = async () => {
  try {
    const connected = await isHikeupConnected();
    if (connected) {
      const { getHikeupOffers } = await import('@/libs/hikeup');
      return await getHikeupOffers();
    }
    return [];
  } catch (error) {
    console.error("Error getting offers:", error);
    return [];
  }
};

// Check if a product has an active discount
export const checkProductDiscount = async (productId: number) => {
  try {
    const connected = await isHikeupConnected();
    if (connected) {
      const { getProductDiscount } = await import('@/libs/hikeup');
      return await getProductDiscount(productId);
    }
    return null;
  } catch (error) {
    console.error("Error checking product discount:", error);
    return null;
  }
};

