"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export const Footer = () => {
  const linkStyles = "text-sm transition duration-150 ease text-text-light hover:text-primary";
  const liStyles = "my-1.5";

  return (
    <footer className="px-6 py-16 border-t border-solid pointer-events-auto bg-bg-alt border-border-primary">
      <nav className="flex flex-wrap justify-around gap-8 mx-auto max-w-screen-2xl">
        {/* Brand Section */}
        <div className="flex flex-col items-center justify-center w-full max-w-xs gap-4">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Image
              src="/logo.png"
              alt="Healing Room"
              width={80}
              height={80}
              className="h-20 w-auto"
            />
            <span className="text-lg font-semibold text-text-primary">
              Healing Room
            </span>
          </Link>
          <p className="text-sm text-text-light text-center">
            Premium Cannabis & Tobacco
          </p>
          <span className="text-xs text-text-muted">
            © {new Date().getFullYear()} Healing Room. All rights reserved.
          </span>
        </div>

        {/* Products Section */}
        <div className="w-full max-w-xs">
          <h2 className="my-3 text-sm font-semibold text-text-primary">Products</h2>
          <ul className="grid grid-cols-2">
            <li className={liStyles}>
              <Link href="/flower" className={linkStyles}>
                Flower
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="/pre-rolls" className={linkStyles}>
                Pre-Rolls
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="/edibles" className={linkStyles}>
                Edibles
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="/vapes" className={linkStyles}>
                Vapes
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="/concentrates" className={linkStyles}>
                Concentrates
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="/accessories" className={linkStyles}>
                Accessories
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Service Section */}
        <div className="w-full max-w-xs">
          <h2 className="my-3 text-sm font-semibold text-text-primary">Customer Service</h2>
          <ul className="grid grid-cols-2">
            <li className={liStyles}>
              <Link href="/orders" className={linkStyles}>
                Order History
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="#" className={linkStyles}>
                Shipping Info
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="#" className={linkStyles}>
                Returns
              </Link>
            </li>
            <li className={liStyles}>
              <Link href="#" className={linkStyles}>
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </nav>

    </footer>
  );
};
