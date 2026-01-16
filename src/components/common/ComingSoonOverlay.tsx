"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function ComingSoonOverlay() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Don't show in development
    if (process.env.NODE_ENV === 'development') {
      setIsUnlocked(true);
      setIsLoading(false);
      return;
    }

    // Check if user has already unlocked in this session
    const unlocked = sessionStorage.getItem("site_unlocked");
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === "forbidden") {
      sessionStorage.setItem("site_unlocked", "true");
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  // Don't render anything while checking unlock status
  if (isLoading) {
    return null;
  }

  // If unlocked, don't show overlay
  if (isUnlocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary/95 via-primary to-primary-dark flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/hero-background.png')] opacity-5 bg-cover bg-center" />
      
      <div className="relative max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <Image
              src="/logo.png"
              alt="Healing Room Six Nations"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Coming Soon Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">
            Coming Soon
          </h1>
          <p className="text-text-light text-sm md:text-base">
            We&apos;re putting the finishing touches on our new website. 
            Enter the access code to preview.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              Access Code
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter access code"
              className="w-full px-4 py-3 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Enter Site
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border-primary text-center">
          <p className="text-xs text-text-muted">
            Healing Room Six Nations
          </p>
          <p className="text-xs text-text-muted mt-1">
            Premium Cannabis & Tobacco Products
          </p>
        </div>
      </div>
    </div>
  );
}
