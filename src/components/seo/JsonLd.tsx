// JSON-LD Structured Data Components for SEO and AI Optimization

export function LocalBusinessJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': 'https://healingroomsixnations.ca/#organization',
    name: 'Healing Room',
    alternateName: 'Healing Room Six Nations',
    description: 'Premium cannabis and tobacco dispensary located in Six Nations, Ontario. Offering a wide selection of flower, pre-rolls, edibles, vapes, concentrates, and tobacco products.',
    url: 'https://healingroomsixnations.ca',
    logo: 'https://healingroomsixnations.ca/logo.png',
    image: 'https://healingroomsixnations.ca/og-image.png',
    email: 'info@healingroomsixnations.ca',
    priceRange: '$$',
    currenciesAccepted: 'CAD',
    paymentAccepted: 'Cash, Debit Card, Credit Card, E-Transfer',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '7147 Indian Line Rd',
      addressLocality: 'Norfolk County',
      addressRegion: 'ON',
      postalCode: 'N0E 1Z0',
      addressCountry: 'CA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 42.9625,
      longitude: -80.1050,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '09:00',
        closes: '22:00',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cannabis & Tobacco Products',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Cannabis Flower',
          description: 'Premium indica, sativa, and hybrid cannabis strains',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Pre-Rolls',
          description: 'Ready-to-smoke cannabis joints and blunts',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Edibles',
          description: 'Cannabis-infused food and beverages',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Vapes',
          description: 'Cannabis vape cartridges and pens',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Concentrates',
          description: 'Cannabis extracts, wax, shatter, and live resin',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Tobacco Products',
          description: 'Premium tobacco and nicotine products',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Accessories',
          description: 'Smoking accessories, papers, pipes, and grinders',
        },
      ],
    },
    sameAs: [
      'https://www.facebook.com/people/Healing-Room-Six-Nations/61582464719082/',
      'https://www.instagram.com/healingroomsixnations_/',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function WebsiteJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://healingroomsixnations.ca/#website',
    url: 'https://healingroomsixnations.ca',
    name: 'Healing Room',
    description: 'Premium cannabis and tobacco dispensary in Six Nations, Ontario',
    publisher: {
      '@id': 'https://healingroomsixnations.ca/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://healingroomsixnations.ca/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-CA',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  currency = 'CAD',
  availability,
  sku,
  brand,
  category,
}: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
  brand?: string;
  category?: string;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku,
    brand: brand ? {
      '@type': 'Brand',
      name: brand,
    } : undefined,
    category,
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : '',
      priceCurrency: currency,
      price,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@id': 'https://healingroomsixnations.ca/#organization',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function FAQJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// Organization schema for AI engines
export function OrganizationJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://healingroomsixnations.ca/#organization',
    name: 'Healing Room',
    legalName: 'Healing Room Six Nations',
    url: 'https://healingroomsixnations.ca',
    logo: {
      '@type': 'ImageObject',
      url: 'https://healingroomsixnations.ca/logo.png',
      width: 512,
      height: 512,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@healingroomsixnations.ca',
      contactType: 'customer service',
      availableLanguage: ['English'],
      areaServed: 'CA',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '7147 Indian Line Rd',
      addressLocality: 'Norfolk County',
      addressRegion: 'Ontario',
      postalCode: 'N0E 1Z0',
      addressCountry: 'Canada',
    },
    sameAs: [
      'https://www.facebook.com/people/Healing-Room-Six-Nations/61582464719082/',
      'https://www.instagram.com/healingroomsixnations_/',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

