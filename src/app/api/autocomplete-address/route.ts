import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "HealingRoomSixNations/1.0";

/**
 * Address autocomplete API using Nominatim
 * Returns address suggestions as user types
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: false,
        error: "Query must be at least 3 characters",
      }, { status: 400 });
    }

    // Search for addresses in Canada (Ontario priority)
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "8", // Show 8 suggestions
      countrycodes: "ca", // Canada only
      bounded: "0",
      // Prioritize Ontario addresses
      viewbox: "-95.16,41.67,-74.32,56.85", // Ontario bounding box (rough)
    });

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
        // Add cache headers to avoid rate limiting
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform results into usable format
    const suggestions = data.map((item: any) => {
      const address = item.address || {};
      
      return {
        displayName: item.display_name,
        streetNumber: address.house_number || "",
        street: address.road || address.street || "",
        city: address.city || address.town || address.village || address.municipality || "",
        province: address.state || "ON",
        postalCode: address.postcode || "",
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    })
    // Filter out results without street addresses (we want specific addresses, not just cities)
    .filter((item: any) => item.street || item.streetNumber);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error("Address autocomplete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch address suggestions",
      },
      { status: 500 }
    );
  }
}

