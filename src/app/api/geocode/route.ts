import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/libs/geocoding";
import { calculateDistance, STORE_LOCATION } from "@/libs/delivery-config";
import { calculateLocalDeliveryFee, isWithinDeliveryArea } from "@/libs/local-delivery-config";

/**
 * Server-side geocoding API to avoid CORS and rate limit issues
 * Nominatim requires server-side requests with proper User-Agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { line1, city, province, postalCode, country } = body;

    if (!line1 || !city || !province || !postalCode) {
      return NextResponse.json(
        { error: "Missing required address fields" },
        { status: 400 }
      );
    }

    // Geocode the address (country is hardcoded to Canada in geocodeAddress)
    const result = await geocodeAddress({
      line1,
      city,
      province,
      postalCode,
    });

    // Check if geocoding failed
    if ('error' in result) {
      return NextResponse.json(
        { 
          success: false,
          error: result.message 
        },
        { status: 400 }
      );
    }

    // Calculate distance from store
    const distance = calculateDistance(
      result.lat,
      result.lng,
      STORE_LOCATION.lat,
      STORE_LOCATION.lng
    );

    // Check if within delivery area
    const isValid = isWithinDeliveryArea(distance);

    // Calculate delivery fee
    const fee = isValid ? calculateLocalDeliveryFee(distance) : null;

    return NextResponse.json({
      success: true,
      coords: { lat: result.lat, lng: result.lng },
      distance,
      isValid,
      fee,
    });
  } catch (error: any) {
    console.error("Geocoding API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to geocode address" 
      },
      { status: 500 }
    );
  }
}

