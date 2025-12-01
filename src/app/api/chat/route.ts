import { NextRequest, NextResponse } from "next/server";
import { searchHikeupProducts, transformHikeupProduct, isHikeupConnected, getProductTypesForFilter, getHikeupProductsByType } from "@/libs/hikeup";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You're a chill, knowledgeable budtender at Healing Room dispensary in Six Nations, Ontario. Talk like a real person - friendly, casual, helpful. No corporate speak.

Location: 7147 Indian Line Rd, Norfolk County. Open 9 AM - 10 PM daily. Phone: (365) 336-7919.

YOU HAVE ACCESS TO:
1. get_categories - See all product categories and how many products in each
2. get_products_by_category - Browse products in a specific category
3. search_products - Search by name, strain, or keyword

HOW TO HELP CUSTOMERS:
- When they ask "what do you have?" or about categories → use get_categories first
- When they ask about a specific type (indica, sativa, vapes, edibles) → use get_products_by_category
- When they search for something specific (strain name, brand) → use search_products
- Use your cannabis knowledge to recommend products based on effects

CRITICAL - READ THE DATA:
- Function results include "totalInCategory" or "totalFound" - this is the REAL count of products
- If totalInCategory is 40 and you're showing 6, there are 34 MORE products available
- NEVER say "that's all we have" or "no others" if the total count is higher than what you showed
- ALWAYS tell the user how many more options exist: "I showed you 6, but we have 40 total indicas!"
- If they want more options, search again or tell them to check the shop page

Be real, helpful, brief. No medical claims. When recommending products, explain why based on strain knowledge.

FORMATTING: Do NOT use markdown (no **, no -, no bullet points, no headers). Write in plain conversational text only. Keep responses short and natural.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Tools definitions for OpenAI (new format for GPT-5.1)
const tools = [
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Get all available product categories/types in the store with product counts. Use this when customers ask what you have, what categories exist, or to show them the variety available.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_products_by_category",
      description: "Get products from a specific category. Use this when customers ask about indica, sativa, hybrid, vapes, edibles, accessories, nicotine, etc.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category name like: indica, sativa, hybrid, cannabis, cannabis-flower, vape, edibles, accessories, nicotine, cbd, thc, carts"
          },
          limit: {
            type: "number",
            description: "How many products to return (default 6, max 12)"
          }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products by name, strain, brand, or keyword. Use this for specific searches like strain names, brands, or specific product types.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term - strain name, brand, product name, or keyword"
          }
        },
        required: ["query"]
      }
    }
  }
];

// Get all available categories with counts
async function getCategories() {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      return { categories: [], error: "Store inventory not available" };
    }

    const types = await getProductTypesForFilter();
    
    return {
      categories: types.map(t => ({
        id: t.id,
        name: t.name,
        productCount: t.count
      })),
      note: "These are all available product categories. Use get_products_by_category to browse a specific one."
    };
  } catch (error) {
    console.error("Get categories error:", error);
    return { categories: [], error: "Could not load categories" };
  }
}

// Helper to get base product name (removes size suffixes like "/ 28g", "/ 14g")
function getBaseProductName(name: string): string {
  // Remove common size suffixes
  return name.replace(/\s*\/\s*\d+(\.\d+)?\s*(g|mg|ml|oz|pk|pack)?\s*$/i, '').trim();
}

// Get products by category - returns unique base products (no size duplicates)
async function getProductsByCategory(category: string, limit: number = 8) {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      return { products: [], error: "Store inventory not available" };
    }

    // Normalize category name to ID format
    const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Fetch more products to find unique ones
    const result = await getHikeupProductsByType(categoryId, 50, 0);
    
    if (result.products.length === 0) {
      return {
        products: [],
        totalInCategory: 0,
        note: `No products found in "${category}" category. Try get_categories to see available categories.`
      };
    }

    // Filter to unique base product names and prioritize in-stock items
    const seenBaseNames = new Set<string>();
    const uniqueProducts: any[] = [];
    
    // Sort by inventory (in-stock first)
    const sortedProducts = result.products.sort((a: any, b: any) => {
      const aStock = a.product_outlets?.[0]?.available_inventory || 0;
      const bStock = b.product_outlets?.[0]?.available_inventory || 0;
      return bStock - aStock;
    });
    
    for (const p of sortedProducts) {
      const t = transformHikeupProduct(p);
      const baseName = getBaseProductName(t.name).toLowerCase();
      
      if (!seenBaseNames.has(baseName)) {
        seenBaseNames.add(baseName);
        uniqueProducts.push({
          id: t.id,
          name: t.name,
          price: t.price,
          category: t.category,
          description: t.description?.slice(0, 150) || '',
          brand: t.brand || '',
          inStock: (t.inventory || 0) > 0
        });
        
        if (uniqueProducts.length >= limit) break;
      }
    }

    return {
      products: uniqueProducts,
      totalInCategory: result.totalCount,
      uniqueCount: seenBaseNames.size,
      note: `Showing ${uniqueProducts.length} unique products from ${result.totalCount} total items in this category.`
    };
  } catch (error) {
    console.error("Get products by category error:", error);
    return { products: [], error: "Could not load products" };
  }
}

// Search products by keyword - returns unique base products
async function searchProducts(query: string) {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      return { products: [], error: "Store inventory not available" };
    }

    const products = await searchHikeupProducts(query);
    
    if (products.length === 0) {
      return {
        products: [],
        note: `No products found matching "${query}". Try get_categories to see what's available, or try a different search term.`
      };
    }

    // Filter to unique base product names and prioritize in-stock items
    const seenBaseNames = new Set<string>();
    const uniqueProducts: any[] = [];
    
    // Sort by inventory (in-stock first)
    const sortedProducts = products.sort((a: any, b: any) => {
      const aStock = a.product_outlets?.[0]?.available_inventory || 0;
      const bStock = b.product_outlets?.[0]?.available_inventory || 0;
      return bStock - aStock;
    });
    
    for (const p of sortedProducts) {
      const t = transformHikeupProduct(p);
      const baseName = getBaseProductName(t.name).toLowerCase();
      
      if (!seenBaseNames.has(baseName)) {
        seenBaseNames.add(baseName);
        uniqueProducts.push({
          id: t.id,
          name: t.name,
          price: t.price,
          category: t.category,
          description: t.description?.slice(0, 150) || '',
          brand: t.brand || '',
          inStock: (t.inventory || 0) > 0
        });
        
        if (uniqueProducts.length >= 10) break;
      }
    }

    return {
      products: uniqueProducts,
      totalFound: products.length,
      uniqueCount: seenBaseNames.size
    };
  } catch (error) {
    console.error("Product search error:", error);
    return { products: [], error: "Search temporarily unavailable" };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Build messages for OpenAI
    const openaiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: Message) => ({ role: m.role, content: m.content }))
    ];

    // First API call - let AI decide if it needs to use tools
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        messages: openaiMessages,
        tools: tools,
        tool_choice: "auto",
        max_completion_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Check if AI wants to call a tool
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      let productsToShow: any[] = [];
      
      // Process ALL tool calls (GPT-5.1 may call multiple at once)
      const toolResponses: any[] = [];
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        
        let functionResult: any = {};
        
        // Execute the requested function
        if (functionName === "get_categories") {
          console.log("📂 AI requested categories");
          functionResult = await getCategories();
        } else if (functionName === "get_products_by_category") {
          console.log("📦 AI requested products by category:", args.category);
          functionResult = await getProductsByCategory(args.category, args.limit || 8);
          if (functionResult.products?.length > 0) {
            productsToShow = functionResult.products.slice(0, 6);
          }
        } else if (functionName === "search_products") {
          console.log("🔍 AI requested product search:", args.query);
          functionResult = await searchProducts(args.query);
          if (functionResult.products?.length > 0) {
            productsToShow = functionResult.products.slice(0, 6);
          }
        }
        
        toolResponses.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        });
      }
      
      // Second API call with ALL tool results
      const followUpMessages = [
        ...openaiMessages,
        choice.message,
        ...toolResponses
      ];

      const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5.1",
          messages: followUpMessages,
          tools: tools,
          tool_choice: "auto",
          max_completion_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!followUpResponse.ok) {
        console.error("OpenAI follow-up error:", await followUpResponse.text());
        return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
      }

      const followUpData = await followUpResponse.json();
      const followUpChoice = followUpData.choices[0];
      
      // Handle if AI wants to call another tool (chained calls)
      if (followUpChoice.finish_reason === "tool_calls" && followUpChoice.message.tool_calls) {
        // Process ALL chained tool calls
        const secondToolResponses: any[] = [];
        
        for (const secondToolCall of followUpChoice.message.tool_calls) {
          const secondFunctionName = secondToolCall.function.name;
          const secondArgs = secondToolCall.function.arguments ? JSON.parse(secondToolCall.function.arguments) : {};
          
          let secondResult: any = {};
          
          if (secondFunctionName === "get_categories") {
            secondResult = await getCategories();
          } else if (secondFunctionName === "get_products_by_category") {
            secondResult = await getProductsByCategory(secondArgs.category, secondArgs.limit || 8);
            if (secondResult.products?.length > 0) {
              productsToShow = secondResult.products.slice(0, 6);
            }
          } else if (secondFunctionName === "search_products") {
            secondResult = await searchProducts(secondArgs.query);
            if (secondResult.products?.length > 0) {
              productsToShow = secondResult.products.slice(0, 6);
            }
          }
          
          secondToolResponses.push({
            role: "tool",
            tool_call_id: secondToolCall.id,
            content: JSON.stringify(secondResult)
          });
        }
        
        // Third API call
        const thirdMessages = [
          ...followUpMessages,
          followUpChoice.message,
          ...secondToolResponses
        ];
        
        const thirdResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-5.1",
            messages: thirdMessages,
            max_completion_tokens: 500,
            temperature: 0.7,
          }),
        });
        
        if (thirdResponse.ok) {
          const thirdData = await thirdResponse.json();
          const assistantMessage = thirdData.choices[0]?.message?.content || "Here's what I found!";
          return NextResponse.json({
            message: assistantMessage,
            products: productsToShow,
          });
        }
      }
      
      const assistantMessage = followUpChoice.message?.content || "I found some information but had trouble describing it. Please try again.";

      return NextResponse.json({
        message: assistantMessage,
        products: productsToShow,
      });
    }

    // No function call - just return the response
    const assistantMessage = choice.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({
      message: assistantMessage,
      products: [],
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
