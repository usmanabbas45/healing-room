# Hikeup POS Integration Guide

This document explains how to integrate Hikeup POS with your e-commerce application.

## Overview

Hikeup is a Point of Sale (POS) system designed for cannabis dispensaries. This integration allows you to:
- Sync products and inventory from Hikeup to your online store
- Sync customer data between systems
- Create orders in Hikeup when customers purchase online
- Keep inventory levels synchronized

## Setup Instructions

### 1. Register as a Hikeup Developer

1. Visit [Hikeup Developer Portal](https://developer.hikeup.com)
2. Sign up for a developer account
3. Create a new application to get OAuth credentials
4. Note down your `Client ID` and `Client Secret`

### 2. Get Your Store ID

1. Log into your Hikeup POS account
2. Navigate to Settings → API/Integrations
3. Find your Store ID (or contact Hikeup support)

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
HIKEUP_CLIENT_ID="your_client_id_here"
HIKEUP_CLIENT_SECRET="your_client_secret_here"
HIKEUP_STORE_ID="your_store_id_here"
HIKEUP_API_BASE_URL="https://api.hikeup.com"
```

### 4. Implement OAuth Flow

The Hikeup API uses OAuth 2.0 authentication. You'll need to implement the OAuth flow in `src/libs/hikeup.ts`. 

**Important:** The current implementation has a placeholder for OAuth. You'll need to:

1. Implement the authorization code flow or client credentials flow based on Hikeup's API documentation
2. Store access tokens securely (consider using a database or secure storage)
3. Implement token refresh logic

Refer to [Hikeup API Documentation](https://docs.hikeup.com) for the exact OAuth implementation details.

### 5. Update API Endpoints

The Hikeup API endpoints in `src/libs/hikeup.ts` are placeholders. You'll need to update them based on the actual Hikeup API documentation:

- Product endpoints: `/v1/products`
- Inventory endpoints: `/v1/inventory`
- Customer endpoints: `/v1/customers`
- Order endpoints: `/v1/orders`

Check the [Hikeup API Reference](https://docs.hikeup.com/docs/intro) for the correct endpoints.

## Usage

### Syncing Products from Hikeup

To sync products from Hikeup to your MongoDB database:

```typescript
import { createHikeupClient } from '@/libs/hikeup';

const hikeupClient = createHikeupClient();
await hikeupClient.syncProductsToMongoDB();
```

Or use the API endpoint:

```bash
POST /api/hikeup/sync
```

### Testing the Connection

Test your Hikeup connection:

```bash
GET /api/hikeup/sync
```

### Manual Product Sync

You can also manually sync products in your code:

```typescript
import { createHikeupClient } from '@/libs/hikeup';

const client = createHikeupClient();
const products = await client.getProducts();
// Process products...
```

## Integration Points

### Product Sync

- **When**: Set up a cron job or scheduled task to sync products periodically
- **Frequency**: Recommended every 15-30 minutes for inventory updates
- **Location**: Consider creating a Next.js API route or serverless function

### Order Sync

When a customer completes a purchase:
1. Create order in your MongoDB database (existing flow)
2. Also create order in Hikeup using `createOrder()`
3. Update inventory in Hikeup

### Customer Sync

When a new customer registers:
1. Create customer in your database (existing flow)
2. Optionally sync to Hikeup using `createCustomer()`

## Data Mapping

### Products

Hikeup products are mapped to your Product model as follows:

- `name` → `name`
- `description` → `description`
- `price` → `price`
- `category` → `category`
- `images` → `image[]`
- `variants` → `variants[]`

### Inventory

Inventory levels should be synced regularly to prevent overselling. The `getInventory()` method can be used to check current stock levels.

## Error Handling

The Hikeup client includes basic error handling. Make sure to:

1. Handle API rate limits
2. Implement retry logic for failed requests
3. Log errors for debugging
4. Notify administrators of sync failures

## Security Considerations

1. **Never commit** `.env.local` with real credentials
2. Store OAuth tokens securely (encrypted database or secure key-value store)
3. Implement proper token refresh logic
4. Use HTTPS for all API calls
5. Validate and sanitize all data from Hikeup before storing

## Troubleshooting

### Common Issues

1. **"OAuth token not implemented"**
   - You need to implement the OAuth flow in `hikeup.ts`
   - Check Hikeup API docs for OAuth implementation

2. **"Failed to connect to Hikeup"**
   - Verify your credentials are correct
   - Check that your Store ID is valid
   - Ensure your IP is whitelisted (if required by Hikeup)

3. **"Invalid endpoint"**
   - Update API endpoints in `hikeup.ts` based on actual Hikeup API documentation
   - Endpoints may differ from placeholders

4. **Rate Limiting**
   - Implement exponential backoff
   - Reduce sync frequency
   - Contact Hikeup support for higher rate limits

## Next Steps

1. ✅ Set up Hikeup developer account
2. ✅ Add credentials to `.env.local`
3. ⏳ Implement OAuth flow in `src/libs/hikeup.ts`
4. ⏳ Update API endpoints based on Hikeup documentation
5. ⏳ Test product sync
6. ⏳ Set up scheduled sync job
7. ⏳ Implement order sync on checkout
8. ⏳ Add error monitoring and alerts

## Resources

- [Hikeup API Documentation](https://docs.hikeup.com)
- [Hikeup Developer Portal](https://developer.hikeup.com)
- [Hikeup Support](https://help.hikeup.com)

## Support

For Hikeup-specific API questions, contact Hikeup support or check their developer documentation. Note that Hikeup provides limited direct support for API development.

