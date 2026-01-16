"use client";

import { useState } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const STORE_LAT = 43.02805;
const STORE_LNG = -80.23135;

export default function InteractiveMap() {
  const [isInteractive, setIsInteractive] = useState(false);

  // Google Maps Embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=Healing+Room+Six+Nations,7147+Indian+Line+Rd,Norfolk+County,ON&center=${STORE_LAT},${STORE_LNG}&zoom=13`;

  return (
    <div className="relative h-[350px] rounded-2xl overflow-hidden">
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0, pointerEvents: isInteractive ? "auto" : "none" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Healing Room Location"
        className="grayscale-[30%] contrast-[1.1]"
      />
      
      {/* Click to interact overlay */}
      {!isInteractive && (
        <div 
          className="absolute inset-0 bg-transparent cursor-pointer flex items-center justify-center"
          onClick={() => setIsInteractive(true)}
        >
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-text-muted shadow-lg hover:bg-white transition-colors">
            Click to interact with map
          </div>
        </div>
      )}
      
      {/* Overlay Info Card */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-white/80 backdrop-blur-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Address */}
          <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="text-center sm:text-left">
              <p className="text-text-primary text-sm font-medium">7147 Indian Line Rd</p>
              <p className="text-text-muted text-xs">Norfolk County, ON</p>
            </div>
          </div>
          
          {/* Hours */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-center sm:text-left">
              <p className="text-text-primary text-sm font-medium">Open Daily</p>
              <p className="text-text-muted text-xs">9AM – 10PM</p>
            </div>
          </div>
          
          {/* Email */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a href="mailto:info@healingroomsixnations.ca" className="text-text-primary text-sm font-medium hover:text-primary transition-colors">
              info@healingroomsixnations.ca
            </a>
          </div>
          
          {/* Get Directions */}
          <a
            href="https://www.google.com/maps/place/Healing+Room/@43.0279134,-80.23136,17z/data=!3m1!4b1!4m6!3m5!1s0x882c5d9d68a8dd8d:0xb21026991cd26f5!8m2!3d43.0279134!4d-80.23136!16s%2Fg%2F11yg0d8yfx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 flex-1 justify-center sm:justify-end text-primary hover:text-primary-dark text-sm font-medium transition-colors"
          >
            Get Directions
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

