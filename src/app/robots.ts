import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://healingroomsixnations.ca';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/cart/',
          '/wishlist/',
          '/orders/',
          '/profile/',
          '/checkout/',
        ],
      },
      {
        // Allow AI crawlers for AIO (AI Optimization)
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'Anthropic-AI',
          'Claude-Web',
          'CCBot',
          'PerplexityBot',
        ],
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/cart/',
          '/wishlist/',
          '/orders/',
          '/profile/',
          '/checkout/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

