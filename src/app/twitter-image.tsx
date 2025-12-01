import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Healing Room Six Nations - Premium Cannabis & Tobacco';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Fetch the logo image
  const logoUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
    : 'https://healingroomsixnations.ca/logo.png';
  
  const logoData = await fetch(logoUrl).then(res => res.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fdfcfa 0%, #ffffff 50%, #f8f5f0 100%)',
          position: 'relative',
        }}
      >
        {/* Decorative background elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(to left, rgba(212, 132, 42, 0.05), transparent)',
          }}
        />
        
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          {/* Logo with circular frame */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f0ece6 0%, #e8e4dd 50%, #ddd8cf 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '3px solid rgba(212, 132, 42, 0.2)',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64}
              alt="Healing Room Logo"
              width={180}
              height={180}
              style={{
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Brand name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 300,
              color: '#2D2D2D',
              letterSpacing: '-2px',
            }}
          >
            Healing Room
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: '#D4842A',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Premium Cannabis & Tobacco
          </div>

          {/* Location */}
          <div
            style={{
              fontSize: 20,
              color: '#666666',
              marginTop: 16,
            }}
          >
            Six Nations, Ontario • Open Daily 9AM - 10PM
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #D4842A, #e9a85c, #D4842A)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}

