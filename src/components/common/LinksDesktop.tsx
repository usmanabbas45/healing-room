"use client";

import Link from "next/link";

export function LinksDesktop() {
  return (
    <Link
      href="/shop"
      className="text-sm font-medium text-text-primary hover:text-primary transition-colors px-4 py-2"
    >
      Shop
    </Link>
  );
}
