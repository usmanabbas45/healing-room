import type { Metadata, Viewport } from "next";
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
import { AgeVerification } from "@/components/common/AgeVerification";
import { LocalBusinessJsonLd, WebsiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";

import "../styles/globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://healingroomsixnations.ca';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#2D2D2D' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  
  // Basic SEO
  title: {
    default: "Healing Room Six Nations | Premium Cannabis & Tobacco Dispensary",
    template: "%s | Healing Room Six Nations",
  },
  description: "Visit Healing Room in Six Nations, Ontario for premium cannabis flower, pre-rolls, edibles, vapes, concentrates, and tobacco products. Open daily 9AM-10PM. Lab-tested quality, expert staff, best prices.",
  keywords: [
    // Primary keywords
    "cannabis dispensary Six Nations",
    "weed store Ontario",
    "marijuana dispensary Norfolk County",
    "cannabis store near me",
    // Product keywords
    "cannabis flower",
    "indica strains",
    "sativa strains",
    "hybrid cannabis",
    "pre-rolls",
    "cannabis edibles",
    "THC gummies",
    "CBD products",
    "vape cartridges",
    "live resin",
    "cannabis concentrates",
    "tobacco products",
    // Local keywords
    "Six Nations dispensary",
    "Norfolk County cannabis",
    "Ontario cannabis store",
    "Indian Line Rd dispensary",
    // Brand keywords
    "Healing Room",
    "Healing Room Six Nations",
  ],
  
  // Authors and ownership
  authors: [{ name: "Healing Room Six Nations", url: BASE_URL }],
  creator: "Healing Room Six Nations",
  publisher: "Healing Room Six Nations",
  
  // Category for better classification
  category: "Cannabis Dispensary",
  
  // Favicon and icons (properly sized for browsers)
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon-32.png", color: "#D4842A" },
    ],
  },
  
  // Open Graph (Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: BASE_URL,
    siteName: "Healing Room Six Nations",
    title: "Healing Room Six Nations | Premium Cannabis & Tobacco Dispensary",
    description: "Your premium cannabis and tobacco dispensary in Six Nations, Ontario. Shop flower, pre-rolls, edibles, vapes, and more. Open daily 9AM-10PM.",
    images: [
      {
        url: "https://healingroomsixnations.ca/og-image.png",
        secureUrl: "https://healingroomsixnations.ca/og-image.png",
        width: 1200,
        height: 630,
        alt: "Healing Room Six Nations - Premium Cannabis & Tobacco Dispensary",
        type: "image/png",
      },
    ],
    countryName: "Canada",
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@healingroomsn",
    creator: "@healingroomsn",
    title: "Healing Room Six Nations | Premium Cannabis & Tobacco",
    description: "Premium cannabis dispensary in Six Nations, ON. Lab-tested flower, edibles, vapes & more. Open 9AM-10PM daily.",
    images: [
      {
        url: "https://healingroomsixnations.ca/og-image.png",
        alt: "Healing Room Six Nations - Premium Cannabis Dispensary",
        width: 1200,
        height: 630,
      },
    ],
  },
  
  // Robots and indexing
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification tags (add your verification codes)
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  
  // Alternate languages (for future expansion)
  alternates: {
    canonical: BASE_URL,
    languages: {
      'en-CA': BASE_URL,
    },
  },
  
  // App information
  applicationName: "Healing Room",
  appleWebApp: {
    capable: true,
    title: "Healing Room",
    statusBarStyle: "default",
  },
  
  // Format detection
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Additional metadata for AI crawlers
  other: {
    // AI Optimization hints
    'ai-content-declaration': 'This is a cannabis dispensary website with product information',
    'content-language': 'en-CA',
    'geo.region': 'CA-ON',
    'geo.placename': 'Six Nations, Norfolk County',
    'geo.position': '42.9625;-80.1050',
    'ICBM': '42.9625, -80.1050',
    // Business info for AI
    'business:contact_data:street_address': '7147 Indian Line Rd',
    'business:contact_data:locality': 'Norfolk County',
    'business:contact_data:region': 'Ontario',
    'business:contact_data:postal_code': 'N0E 1Z0',
    'business:contact_data:country_name': 'Canada',
    'business:contact_data:email': 'info@healingroomsixnations.ca',
    // Price range for search
    'price-range': '$$',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: Session | null = await getServerSession(authOptions);
  
  console.log("🟡 [LAYOUT] Session from getServerSession:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
    fullSession: session,
  });
  
  const totalItemsCart = await getTotalItems(session);
  const totalItemsWishlists = await getTotalWishlist();

  return (
    <html lang="en-CA">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://hikeupdatastorage.s3-us-west-2.amazonaws.com" />
        <link rel="dns-prefetch" href="https://hikeupdatastorage.s3-us-west-2.amazonaws.com" />
        {/* JSON-LD Structured Data for SEO and AI */}
        <LocalBusinessJsonLd />
        <WebsiteJsonLd />
        <OrganizationJsonLd />
      </head>
      <Providers>
        <body className={GeistSans.className}>
          <AgeVerification />
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
