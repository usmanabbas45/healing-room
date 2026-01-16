import { NextRequest, NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Address autocomplete API using Google Places API Autocomplete
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

    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key not configured");
    }

    // Use Google Places API Autocomplete
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_MAPS_API_KEY,
      components: "country:ca", // Canada only
      types: "address", // Only return addresses (not establishments)
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
      {
        // Add cache headers
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API status: ${data.status}`);
    }

    // For each prediction, we need to get place details to extract address components
    const suggestions = await Promise.all(
      (data.predictions || []).slice(0, 8).map(async (prediction: any) => {
        try {
          // Get place details
          const detailsParams = new URLSearchParams({
            place_id: prediction.place_id,
            key: GOOGLE_MAPS_API_KEY,
            fields: "address_components,geometry",
          });

          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`
          );

          if (!detailsResponse.ok) {
            return null;
          }

          const detailsData = await detailsResponse.json();

          if (detailsData.status !== "OK" || !detailsData.result) {
            return null;
          }

          const { address_components, geometry } = detailsData.result;

          // Extract address components
          let streetNumber = "";
          let street = "";
          let city = "";
          let province = "";
          let postalCode = "";

          for (const component of address_components) {
            const types = component.types;

            if (types.includes("street_number")) {
              streetNumber = component.long_name;
            } else if (types.includes("route")) {
              street = component.long_name;
            } else if (types.includes("locality")) {
              city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              province = component.short_name; // e.g., "ON"
            } else if (types.includes("postal_code")) {
              postalCode = component.long_name;
            }
          }

          return {
            displayName: prediction.description,
            streetNumber,
            street,
            city,
            province,
            postalCode,
            lat: geometry.location.lat,
            lng: geometry.location.lng,
          };
        } catch (error) {
          console.error("Error fetching place details:", error);
          return null;
        }
      })
    );

    // Filter out null results
    const validSuggestions = suggestions.filter((s) => s !== null);

    return NextResponse.json({
      success: true,
      suggestions: validSuggestions,
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

