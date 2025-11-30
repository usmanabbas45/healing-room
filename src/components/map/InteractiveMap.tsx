"use client";

import { useState } from "react";

export default function InteractiveMap() {
  const [isInteractive, setIsInteractive] = useState(false);

  return (
    <div className="relative h-[350px] rounded-2xl overflow-hidden">
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=-80.1150%2C42.9550%2C-80.0950%2C42.9700&layer=mapnik&marker=42.9625%2C-80.1050"
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
          
          {/* Phone */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href="tel:+13653367919" className="text-text-primary text-sm font-medium hover:text-primary transition-colors">
              (365) 336-7919
            </a>
          </div>
          
          {/* Get Directions */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=7147+Indian+Line+Rd+Norfolk+County+ON+N0E+1Z0"
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

