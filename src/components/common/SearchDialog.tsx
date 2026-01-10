"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const SearchDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="text-sm py-3 px-3 rounded-md transition-all text-text-primary hover:bg-bg-alt hover:text-primary"
          aria-label="Search products"
        >
          <svg
            height="16"
            strokeLinejoin="round"
            viewBox="0 0 16 16"
            width="16"
            style={{ color: "currentcolor" }}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl p-0 gap-0 bg-white border-border-primary overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Search Products</DialogTitle>
          <DialogDescription>
            Search for cannabis and tobacco products in our store
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex items-center border-b border-border-primary">
          {/* Search icon */}
          <span className="h-14 w-14 flex items-center justify-center text-text-muted flex-shrink-0">
            <svg
              height="20"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="20"
              style={{ color: "currentcolor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-14 pr-4 bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          
          {/* Search button */}
          {searchTerm.trim() && (
            <button
              onClick={handleSearch}
              className="h-14 px-6 bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              Search
            </button>
          )}
        </div>
        
        {/* Hint text */}
        <div className="px-4 py-3 text-sm text-text-muted bg-bg-alt/50">
          <span className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 text-xs bg-white border border-border-primary rounded">Enter</kbd>
            to search
            <span className="mx-2">•</span>
            <kbd className="px-2 py-0.5 text-xs bg-white border border-border-primary rounded">Esc</kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;

