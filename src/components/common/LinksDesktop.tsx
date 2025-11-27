"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/libs/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export function LinksDesktop() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="text-text-primary hover:text-primary">
            Shop
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] bg-white">
              <li className="row-span-4">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex flex-col justify-end w-full h-full p-6 no-underline rounded-md outline-none select-none bg-gradient-to-b from-primary/10 to-primary/5 border border-border-primary focus:shadow-md hover:border-primary transition-colors"
                    href="/"
                  >
                    <div className="text-2xl mb-2">🌿</div>
                    <div className="mt-4 mb-1 text-sm font-semibold text-text-primary">
                      VIEW ALL PRODUCTS
                    </div>
                    <p className="text-sm leading-tight text-text-light">
                      Browse our full selection of premium cannabis & tobacco products.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem href="/flower" title="🌸 FLOWER">
                Premium hand-selected cannabis flower. Indica, Sativa, and Hybrid strains available.
              </ListItem>
              <ListItem href="/pre-rolls" title="🚬 PRE-ROLLS">
                Ready-to-smoke joints and blunts. Perfect for convenience.
              </ListItem>
              <ListItem href="/edibles" title="🍬 EDIBLES">
                Delicious cannabis-infused treats. Gummies, chocolates, and more.
              </ListItem>
              <ListItem href="/vapes" title="💨 VAPES">
                Premium vape cartridges and disposables for smooth hits.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-bg-alt hover:border-primary border border-transparent",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none text-text-primary">
            {title}
          </div>
          <p className="text-sm leading-snug line-clamp-2 text-text-light mt-1">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
