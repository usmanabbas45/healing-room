"use client";

import { useState } from "react";
import { ContactDialog } from "./ContactDialog";

interface ContactButtonProps {
  variant?: "primary" | "outline";
  className?: string;
}

export function ContactButton({ variant = "primary", className = "" }: ContactButtonProps) {
  const [open, setOpen] = useState(false);

  const baseStyles = "inline-flex items-center gap-3 px-8 py-4 text-sm tracking-wider uppercase font-medium transition-all duration-300";
  
  // Only apply default variant styles if no custom className overrides them
  const hasCustomStyles = className.includes("border") || className.includes("bg-") || className.includes("text-");
  
  const variantStyles = hasCustomStyles ? "" : (
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-dark rounded-full shadow-lg shadow-primary/25 hover:scale-105"
      : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-white rounded-full"
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Contact Us
      </button>
      <ContactDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

