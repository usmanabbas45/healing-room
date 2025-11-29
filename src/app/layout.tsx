import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Providers from "./Providers";
import { Navbar } from "../components/common/Navbar";
import { Footer } from "../components/common/Footer";
import { Toaster } from "sonner";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getTotalItems } from "./(carts)/cart/action";
import { getTotalWishlist } from "./(carts)/wishlist/action";
import ChatWidget from "@/components/chat/ChatWidget";

import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "Healing Room | Premium Cannabis & Tobacco",
    template: "%s | Healing Room",
  },
  description: "Your premium cannabis and tobacco dispensary. Shop flower, pre-rolls, edibles, vapes, and more.",
  keywords: ["cannabis", "dispensary", "marijuana", "weed", "flower", "edibles", "pre-rolls", "vapes", "tobacco"],
  authors: [{ name: "Healing Room" }],
  creator: "Healing Room",
  publisher: "Healing Room",
  
  // Favicon
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  
  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Healing Room",
    title: "Healing Room | Premium Cannabis & Tobacco",
    description: "Your premium cannabis and tobacco dispensary. Shop flower, pre-rolls, edibles, vapes, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Healing Room - Premium Cannabis & Tobacco",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Healing Room | Premium Cannabis & Tobacco",
    description: "Your premium cannabis and tobacco dispensary. Shop flower, pre-rolls, edibles, vapes, and more.",
    images: ["/og-image.png"],
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
  },
  
  // Manifest
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: Session | null = await getServerSession(authOptions);
  const totalItemsCart = await getTotalItems(session);
  const totalItemsWishlists = await getTotalWishlist();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <Providers>
        <body className={GeistSans.className}>
          <Navbar
            session={session}
            totalItemsCart={totalItemsCart}
            totalWishlists={totalItemsWishlists?.items.length}
          />
          <main className="pointer-events-auto">
            {children}
            <Toaster position="top-right" />
          </main>
          <Footer />
          <ChatWidget />
        </body>
      </Providers>
    </html>
  );
}
