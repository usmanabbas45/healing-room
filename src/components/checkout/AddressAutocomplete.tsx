"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface AddressSuggestion {
  displayName: string;
  streetNumber: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedValue = useDebounce(value, 300);

  // Search for address suggestions
  useEffect(() => {
    const searchAddress = async () => {
      if (!debouncedValue || debouncedValue.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/autocomplete-address?q=${encodeURIComponent(debouncedValue)}`);
        const data = await response.json();

        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions);
          setShowDropdown(data.suggestions.length > 0);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error("Address autocomplete error:", error);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    searchAddress();
  }, [debouncedValue]);

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
  );
}

