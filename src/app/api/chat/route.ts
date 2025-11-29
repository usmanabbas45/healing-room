import { NextRequest, NextResponse } from "next/server";
import { searchHikeupProducts, getHikeupProducts, transformHikeupProduct, isHikeupConnected } from "@/libs/hikeup";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You're a chill, knowledgeable budtender at Healing Room dispensary in Six Nations, Ontario. Talk like a real person - friendly, casual, helpful. No corporate speak.

Location: 7147 Indian Line Rd, Norfolk County. Open 9 AM - 10 PM daily. Phone: (365) 336-7919.

SEARCHING PRODUCTS:
- Product names contain STRAIN NAMES (not words like "flower" or "indica")
- Use YOUR cannabis knowledge to pick good search terms
- Search for common strain name patterns you know are indica/sativa/hybrid
- If a search returns nothing, try a different strain term you know

TIPS:
- For sleep/pain → search indica strain names you know
- For energy/focus → search sativa strain names you know
- For edibles → try "gummy", "mg", "chocolate"
- For vapes → try "cart", "vape", "pen"

When you find products, look at the names - if you recognize strains, explain why you're recommending them based on their effects.

Be real, helpful, brief. No medical claims.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Function definitions for OpenAI
const functions = [
  {
    name: "search_products",
    description: "Search the store's cannabis product inventory by name, type, or effect. Use this when the customer asks about specific products or what might help with sleep, pain, anxiety, relaxation, energy, etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term - product name, category (flower, edibles, vapes, pre-rolls), or effect (sleep, pain, relaxation, energy, anxiety)"
        }
      },
      required: ["query"]
    }
  }
];

async function searchProducts(query: string) {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      return { products: [], error: "Store inventory not available" };
    }

    // Search for products
    const products = await searchHikeupProducts(query);
    
    // If no results, tell the AI - don't show random products
    if (products.length === 0) {
      return {
        products: [],
        note: `No products found matching "${query}". Try searching for a different strain name or product type.`
      };
    }

    return {
      products: products.slice(0, 10).map(p => {
        const t = transformHikeupProduct(p);
        return { 
          id: t.id, 
          name: t.name, 
          price: t.price, 
          category: t.category,
          description: t.description || '',
          brand: t.brand || '',
        };
      })
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

    // First API call - let AI decide if it needs to search
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        functions: functions,
        function_call: "auto",
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Check if AI wants to call a function
    if (choice.finish_reason === "function_call" && choice.message.function_call) {
      const functionCall = choice.message.function_call;
      
      if (functionCall.name === "search_products") {
        const args = JSON.parse(functionCall.arguments);
        console.log("🔍 AI requested product search:", args.query);
        
        const searchResult = await searchProducts(args.query);
        
        // Second API call with search results
        const followUpMessages = [
          ...openaiMessages,
          choice.message,
          {
            role: "function",
            name: "search_products",
            content: JSON.stringify(searchResult)
          }
        ];

        const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: followUpMessages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!followUpResponse.ok) {
          console.error("OpenAI follow-up error:", await followUpResponse.text());
          return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
        }

        const followUpData = await followUpResponse.json();
        const assistantMessage = followUpData.choices[0]?.message?.content || "I found some products but had trouble describing them. Please try again.";

        return NextResponse.json({
          message: assistantMessage,
          products: searchResult.products?.slice(0, 3) || [],
        });
      }
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
