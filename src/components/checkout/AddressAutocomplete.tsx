"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import Script from "next/script";

interface AddressSuggestion {
  displayName: string;
  streetNumber: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (address: {
    line1: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelectAddress,
  placeholder = "Start typing your address...",
  className = "",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const debouncedValue = useDebounce(value, 300);

  // Initialize Google Maps services once loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      // PlacesService requires a div element
      const div = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(div);
    }
  }, [isGoogleLoaded]);

  // Search for address suggestions using Google Places API
  useEffect(() => {
    const searchAddress = async () => {
      if (!debouncedValue || debouncedValue.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      if (!autocompleteServiceRef.current || !placesServiceRef.current) {
        return;
      }

      setIsLoading(true);
      try {
        // Get autocomplete predictions
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: debouncedValue,
            componentRestrictions: { country: 'ca' }, // Canada only
            types: ['address'], // Only addresses
          },
          async (predictions: any[], status: string) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
              setSuggestions([]);
              setShowDropdown(false);
              setIsLoading(false);
              return;
            }

            // Get details for each prediction (limit to 8)
            const detailsPromises = predictions.slice(0, 8).map((prediction) => 
              new Promise<AddressSuggestion | null>((resolve) => {
                placesServiceRef.current.getDetails(
                  {
                    placeId: prediction.place_id,
                    fields: ['address_components', 'geometry'],
                  },
                  (place: any, status: string) => {
                    if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
                      resolve(null);
                      return;
                    }

                    // Parse address components
                    let streetNumber = '';
                    let street = '';
                    let city = '';
                    let province = '';
                    let postalCode = '';

                    for (const component of place.address_components) {
                      const types = component.types;

                      if (types.includes('street_number')) {
                        streetNumber = component.long_name;
                      } else if (types.includes('route')) {
                        street = component.long_name;
                      } else if (types.includes('locality')) {
                        city = component.long_name;
                      } else if (types.includes('administrative_area_level_1')) {
                        province = component.short_name; // e.g., "ON"
                      } else if (types.includes('postal_code')) {
                        postalCode = component.long_name;
                      }
                    }

                    resolve({
                      displayName: prediction.description,
                      streetNumber,
                      street,
                      city,
                      province,
                      postalCode,
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                      placeId: prediction.place_id,
                    });
                  }
                );
              })
            );

            const results = await Promise.all(detailsPromises);
            const validSuggestions = results.filter((s): s is AddressSuggestion => s !== null);
            
            setSuggestions(validSuggestions);
            setShowDropdown(validSuggestions.length > 0);
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error("Address autocomplete error:", error);
        setSuggestions([]);
        setShowDropdown(false);
        setIsLoading(false);
      }
    };

    searchAddress();
  }, [debouncedValue, isGoogleLoaded]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    const streetAddress = suggestion.street 
      ? `${suggestion.streetNumber} ${suggestion.street}`.trim()
      : suggestion.displayName.split(',')[0];

    onChange(streetAddress);
    onSelectAddress({
      line1: streetAddress,
      city: suggestion.city,
      province: suggestion.province || "ON",
      postalCode: suggestion.postalCode || "",
    });

    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  return (
    <>
      {/* Load Google Maps JavaScript API */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => setIsGoogleLoaded(true)}
        strategy="lazyOnload"
      />

      <div className="relative">
        <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
        required
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-border-primary last:border-b-0 ${
                index === selectedIndex ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <svg 
                  className="w-4 h-4 text-primary shrink-0 mt-0.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {suggestion.street 
                      ? `${suggestion.streetNumber} ${suggestion.street}`.trim()
                      : suggestion.displayName.split(',')[0]
                    }
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {suggestion.city}, {suggestion.province} {suggestion.postalCode}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {!isLoading && value.length >= 3 && showDropdown && suggestions.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-border-primary rounded-lg shadow-lg px-4 py-3"
        >
          <p className="text-sm text-text-muted">
            No addresses found. Try entering more details.
          </p>
        </div>
      )}
      </div>
    </>
  );
}

