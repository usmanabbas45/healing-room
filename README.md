# Healing Room - Cannabis E-commerce

A modern e-commerce platform for cannabis dispensaries, built with Next.js and integrated with Hikeup POS for real-time inventory management.

## 🚀 Features
- Clean, modern white design
- User Authentication (Email/Password)
- Real-time inventory from Hikeup POS
- Product Catalog with Categories
- Shopping Cart Functionality
- Product Search
- User Profile Management
- Stripe Payment Processing
- Order History
- Admin Dashboard
- Responsive Design
- SEO Optimized

## 🛠 Installation & Set Up

1. Install dependencies
```bash
npm install
```

2. Run the development server
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database (Railway PostgreSQL)
DATABASE_URL=your_postgresql_url

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Hikeup POS Integration
HIKEUP_CLIENT_ID=your_hikeup_app_id
HIKEUP_CLIENT_SECRET=your_hikeup_app_secret
HIKEUP_STORE_ID=

# Email (Proton Mail SMTP)
PROTON_EMAIL_ADDRESS=your_email
PROTON_SMTP_TOKEN=your_smtp_token

# Image Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

## 🔗 Hikeup POS Integration

This project integrates with Hikeup POS for real-time product and inventory management.

### Setup:
1. Create an app in the [Hikeup Developer Portal](https://developer.hikeup.com)
2. Add your redirect URI: `http://localhost:3000/api/hikeup/callback`
3. Add your credentials to `.env`
4. Go to `/admin` and click "Connect Hikeup POS"
5. Log in with your store's Hikeup credentials
6. Products will sync automatically!

## 📁 Project Structure
```
src/
├── app/              
│   ├── api/           # API endpoints
│   ├── admin/         # Admin dashboard
│   ├── [category]/    # Category & product pages
│   ├── cart/          # Shopping cart
│   ├── login/         # Authentication
│   └── orders/        # Order history
├── components/    
│   ├── common/        # Layout components
│   ├── products/      # Product components
│   ├── cart/          # Cart components
│   ├── account/       # Auth components
│   └── ui/            # UI components
├── libs/              
│   ├── prisma.ts      # Database client
│   ├── auth.ts        # Authentication
│   └── hikeup.ts      # Hikeup POS integration
└── styles/            # CSS
```

## 🛍️ Product Categories

- Flower
- Pre-Rolls
- Edibles
- Vapes
- Concentrates
- Accessories

## 🚀 Deployment

Deploy on Railway:
1. Push to GitHub
2. Connect to Railway
3. Add PostgreSQL database
4. Configure environment variables
5. Deploy!

## 📝 License
This project is licensed under the MIT License.
