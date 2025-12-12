"use client";

import { useState, useEffect } from "react";
import { geocodeAddress, isValidDeliveryAddress, getEstimatedDeliveryTime } from "@/libs/geocoding";
import {
  calculateDistance,
  calculateLocalDeliveryFee,
  isWithinDeliveryArea,
  STORE_LOCATION,
} from "@/libs/local-delivery-config";
import { Loader } from "@/components/common/Loader";

interface DeliveryAreaValidatorProps {
  address: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  onDistanceCalculated: (distance: number, fee: number, coords: { lat: number; lng: number }) => void;
  onValidationError: (error: string) => void;
}

export default function DeliveryAreaValidator({
  address,
  onDistanceCalculated,
  onValidationError,
}: DeliveryAreaValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  useEffect(() => {
    // Only validate if we have all required address fields
    if (address.line1 && address.city && address.province && address.postalCode) {
      validateDeliveryArea();
    } else {
      // Reset state if address is incomplete
      setDistance(null);
      setDeliveryFee(null);
      setError(null);
      setCoords(null);
    }
  }, [address.line1, address.city, address.province, address.postalCode]);
  
  const validateDeliveryArea = async () => {
    setIsValidating(true);
    setError(null);
    setDistance(null);
    setDeliveryFee(null);
    
    try {
      // Geocode the address using Nominatim (OpenStreetMap)
      const result = await geocodeAddress(address);
      
      // Check if geocoding failed
      if ("error" in result) {
        setError(result.message);
        onValidationError(result.message);
        return;
      }
      
      // Validate address is in deliverable area (Canada, Ontario)
      const validation = isValidDeliveryAddress(result);
      if (!validation.valid) {
        setError(validation.message || "Address not in delivery area");
        onValidationError(validation.message || "Address not in delivery area");
        return;
      }
      
      // Calculate distance from store
      const dist = calculateDistance(result.lat, result.lng);
      setDistance(dist);
      setCoords({ lat: result.lat, lng: result.lng });
      
      // Check if within delivery radius
      if (!isWithinDeliveryArea(dist)) {
        setError(
          `Address is ${dist.toFixed(1)} km away (maximum ${50} km). Please contact us at ${STORE_LOCATION.phone} for a custom delivery quote.`
        );
        onValidationError("Outside delivery area");
        return;
      }
      
      // Calculate delivery fee
      const fee = calculateLocalDeliveryFee(dist);
      setDeliveryFee(fee);
      
      // Notify parent component
      onDistanceCalculated(dist, fee, { lat: result.lat, lng: result.lng });
      
    } catch (err) {
      console.error("Validation error:", err);
      setError("Unable to validate address. Please verify your address or contact us.");
      onValidationError("Validation failed");
    } finally {
      setIsValidating(false);
    }
  };
  
  if (isValidating) {
    return (
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader height={20} width={20} />
          <div>
            <p className="text-sm font-medium text-blue-900">Calculating delivery distance...</p>
            <p className="text-xs text-blue-700 mt-1">Using OpenStreetMap geocoding</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Delivery Area Issue</p>
            <p className="text-xs text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (distance !== null && deliveryFee !== null) {
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">✓ Address Verified</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-800">Distance from store:</span>
                  <span className="text-sm font-semibold text-green-900">{distance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-800">Delivery fee:</span>
                  <span className="text-lg font-bold text-primary">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-green-200">
                  <span className="text-xs text-green-800">Estimated delivery time:</span>
                  <span className="text-xs font-medium text-green-900">
                    {getEstimatedDeliveryTime(distance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show Map Button */}
        {coords && (
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="w-full text-sm text-primary hover:text-primary-dark font-medium flex items-center justify-center gap-2 py-2"
          >
            {showMap ? "Hide Map" : "View on Map"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMap ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
        )}
        
        {/* Embedded Map */}
        {showMap && coords && (
          <div className="relative h-[250px] rounded-lg overflow-hidden border border-border-primary">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.05}%2C${coords.lat - 0.05}%2C${coords.lng + 0.05}%2C${coords.lat + 0.05}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              title="Delivery Location"
            />
          </div>
        )}
      </div>
    );
  }
  
  return null;
}

