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
  getHikeupOffers,
  getProductsFromDatabase,
  getProductTypesFromDatabase,
  type HikeupOffer,
} from "@/libs/hikeup";
import { applyPriceMarkup } from "@/libs/pricing";

// Check discount against pre-fetched offers (no API call)
// Now accepts full product data to check product types and brands
function checkDiscountFromOffers(product: any, offers: HikeupOffer[]): {
  discountPercentage: number;
  discountAmount: number;
  offerName: string;
  validUntil: string | null; // Can be null for offers with no expiry
} | null {
  const productId = Number(product.id);
  
  // Extract product type IDs and brand ID from the product
  const productTypeIds = (product.product_type || []).map((pt: any) => Number(pt.type_id || pt.id));
  const brandId = product.brand_id ? Number(product.brand_id) : null;
  
  for (const offer of offers) {
    // Determine quantity threshold
    const quantityThreshold = offer.minimumQuantity || offer.buyX;
    
    // ⚠️ SKIP quantity-based deals (Buy X or more get discount)
    // These should only be applied in the cart when quantity threshold is met
    if (quantityThreshold && quantityThreshold > 1) {
      console.log(`⏭️  Skipping quantity-based offer "${offer.name}" (requires ${quantityThreshold} items - only apply in cart)`);
      continue;
    }
    
    // ⚠️ SKIP true BOGO deals (Buy X Get X free)
    if (offer.buyX && offer.getX) {
      console.log(`⏭️  Skipping BOGO offer "${offer.name}" (Buy ${offer.buyX} Get ${offer.getX} free - only apply in cart)`);
      continue;
    }
    
    // 1. Check if specific product ID matches (offerOn = 5)
    if (offer.applicableProducts && offer.applicableProducts.some(p => p.id === productId)) {
      console.log(`✅ Product ${productId} matches offer "${offer.name}" (specific product)`);
      return {
        discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        offerName: offer.name,
        validUntil: offer.validTo,
      };
    }
    
    // 2. Check if product type matches (offerOn = 1)
    if (offer.applicableProductTypeIds && offer.applicableProductTypeIds.length > 0) {
      const hasMatchingType = productTypeIds.some((typeId: number) => 
        offer.applicableProductTypeIds!.includes(typeId)
      );
      if (hasMatchingType) {
        console.log(`✅ Product ${productId} matches offer "${offer.name}" (product type match)`);
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
          validUntil: offer.validTo,
        };
      }
    }
    
    // 3. Check if brand matches (offerOn = 2)
    if (brandId && offer.applicableBrandIds && offer.applicableBrandIds.length > 0) {
      if (offer.applicableBrandIds.includes(brandId)) {
        console.log(`✅ Product ${productId} matches offer "${offer.name}" (brand match)`);
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
          validUntil: offer.validTo,
        };
      }
    }
    
    // 4. Check if it's a store-wide offer (no restrictions)
    if ((!offer.applicableProducts || offer.applicableProducts.length === 0) &&
        (!offer.applicableProductTypeIds || offer.applicableProductTypeIds.length === 0) &&
        (!offer.applicableBrandIds || offer.applicableBrandIds.length === 0)) {
      console.log(`✅ Product ${productId} matches offer "${offer.name}" (store-wide)`);
      return {
        discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        offerName: offer.name,
        validUntil: offer.validTo,
      };
    }
  }
  
  return null;
}

// Transform Hikeup product with discount data (uses pre-fetched offers)
function transformHikeupProductWithDiscount(product: any, offers: HikeupOffer[]) {
  const baseProduct = transformHikeupProduct(product);
  
  // Check if product has an active discount (pass full product for type/brand matching)
  const discount = checkDiscountFromOffers(product, offers);
  
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
    console.log(`🔍 getAllProducts called (page ${page}, size ${pageSize}, type ${typeFilter})`);
    
    // Check if Hikeup is connected
    const connected = await isHikeupConnected();
    console.log('🔗 Hikeup connected:', connected);
    
    if (connected) {
      console.log('📦 Fetching products from DATABASE CACHE (instant, no API calls)...');
      
      // Fetch offers ONCE for all products (1 API call)
      console.log('🎁 Fetching offers from Hikeup (1 API call)...');
      const offers = await getHikeupOffers();
      console.log(`✅ Got ${offers.length} active offers`);
      
      // Get products from database cache (instant!)
      const { products: cachedProducts, totalCount } = await getProductsFromDatabase(
        typeFilter,
        page,
        pageSize
      );
      
      console.log(`📦 Got ${cachedProducts.length} products from database cache (total: ${totalCount})`);
      
      if (cachedProducts.length > 0) {
        // Transform with offers (no additional API calls)
        const transformed = cachedProducts.map(p => transformHikeupProductWithDiscount(p, offers));
        return { products: transformed, totalCount };
      }
      
      console.log('⚠️ No products in database cache, database may need syncing');
    }

    // Fall back to database
    console.log('📦 Fetching products from database...');
    const skipCount = (page - 1) * pageSize;
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
      // Get count from database cache (instant, no API calls!)
      console.log('🔍 Fetching product count from database cache...');
      const count = await prisma.hikeupProductCache.count({
        where: { isActive: true }
      });
      return count;
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
      console.log(`📦 Fetching ${category} from database cache...`);
      
      // Fetch offers once
      const offers = await getHikeupOffers();
      
      // Normalize category to type ID format
      const typeId = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Get from database cache (instant!)
      const { products: cachedProducts } = await getProductsFromDatabase(typeId, 1, 100);
      return cachedProducts.map(p => transformHikeupProductWithDiscount(p, offers));
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
      // Fetch offers once
      const offers = await getHikeupOffers();
      
      // Get count from database cache
      const totalCount = await prisma.hikeupProductCache.count({
        where: { isActive: true }
      });
      
      // Calculate random offset
      const maxOffset = Math.max(0, totalCount - 24);
      const randomOffset = Math.floor(Math.random() * maxOffset);
      
      console.log(`📦 Fetching random products from database cache (offset: ${randomOffset}, total: ${totalCount})`);
      
      // Get random batch from database cache (instant!)
      const randomPage = Math.floor(randomOffset / 24) + 1;
      const { products: cachedProducts } = await getProductsFromDatabase('all', randomPage, 24);
      
      const filtered = cachedProducts.filter(p => String(p.id) !== productId);
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 6);
      return selected.map(p => transformHikeupProductWithDiscount(p, offers));
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
      
      // Fetch offers once
      const offers = await getHikeupOffers();
      
      const hikeupProduct = await getHikeupProduct(id);
      if (hikeupProduct) {
        // Transform raw Hikeup product to website format with discount data
        const transformedProduct = transformHikeupProductWithDiscount(hikeupProduct, offers);
        
        // FETCH VARIANT PRODUCTS FROM DATABASE to get their actual images
        // Variants in product_variants array don't have image data, but the separate variant products do
        const variantProducts = await prisma.hikeupProductCache.findMany({
          where: {
            parentId: parseInt(id),
            isActive: true,
          },
        });
        
        console.log(`🔍 Found ${variantProducts.length} variant products in database for parent ${id}`);
        
        // Merge variant images into the transformed product
        if (variantProducts.length > 0 && transformedProduct.variants) {
          transformedProduct.variants = transformedProduct.variants.map((variant: any) => {
            // Find matching variant product by SKU or name
            const variantProduct = variantProducts.find((vp) => {
              const vpData = JSON.parse(vp.rawData);
              return vpData.sku === variant.sku || vpData.name.includes(variant.name) || vpData.name.includes(variant.color);
            });
            
            if (variantProduct) {
              const vpData = JSON.parse(variantProduct.rawData);
              const variantImages: string[] = [];
              
              // Extract images from additional_images array
              if (vpData.additional_images && Array.isArray(vpData.additional_images)) {
                vpData.additional_images.forEach((img: any) => {
                  const imgUrl = img['500_thumbnail'] || img['240_thumbnail'] || img['50_thumbnail'] || img.image_url;
                  if (imgUrl) variantImages.push(imgUrl);
                });
              }
              
              // Use variant images if we found any
              if (variantImages.length > 0) {
                variant.images = variantImages;
              }
            }
            
            return variant;
          });
        }
        
        return transformedProduct;
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
      // Fetch offers once
      const offers = await getHikeupOffers();
      
      const hikeupProducts = await searchHikeupProducts(query);
      let transformedProducts = hikeupProducts.map(p => transformHikeupProductWithDiscount(p, offers));
      
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
      console.log('📦 Fetching product types from DATABASE CACHE...');
      const types = await getProductTypesFromDatabase();
      
      // Add "All Products" option at the beginning
      return [
        { id: 'all', name: 'All Products', count: types.reduce((sum, t) => sum + t.count, 0) },
        ...types.map(t => ({
          id: t.id,
          name: t.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          count: t.count,
        })),
      ];
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

