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
  getCachedTotalCount,
} from "@/libs/hikeup";

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
        const transformed = hikeupProducts.map(transformHikeupProduct);
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
    return { products: products.map(transformProduct), totalCount };
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
      // Try cache first
      const cached = getCachedTotalCount();
      if (cached !== null) {
        console.log('📦 Using cached total count:', cached);
        return cached;
      }
      
      // Fetch just 1 product to get totalCount
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
      return hikeupProducts.map(transformHikeupProduct);
    }

    // Fall back to database
    const products = await prisma.product.findMany({
      where: { category },
      include: {
        variants: true,
      },
    });
    return products.map(transformProduct);
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
      const { totalCount } = await getHikeupProductsWithMeta(1, 0); // Get total count first (cached)
      const maxOffset = Math.max(0, totalCount - 24);
      const randomOffset = Math.floor(Math.random() * maxOffset);
      
      console.log(`📦 Fetching random products (offset: ${randomOffset}, total: ${totalCount})`);
      const { products: hikeupProducts } = await getHikeupProductsWithMeta(24, randomOffset);
      
      const filtered = hikeupProducts.filter(p => String(p.id) !== productId);
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6).map(transformHikeupProduct);
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
    return shuffled.slice(0, 6).map(transformProduct);
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
        // Transform raw Hikeup product to website format
        return transformHikeupProduct(hikeupProduct);
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
    return product;
  } catch (error) {
    console.error("Error getting product:", error);
    return null;
  }
};

export const searchProducts = async (query: string) => {
  try {
    const connected = await isHikeupConnected();
    
    if (connected) {
      const hikeupProducts = await searchHikeupProducts(query);
      return hikeupProducts.map(transformHikeupProduct);
    }

    // Fall back to database
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
    return products.map(transformProduct);
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
