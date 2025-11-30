"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function AgeVerification() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if user has already verified
    const verified = localStorage.getItem("age-verified");
    if (verified === "true") {
      setIsVerified(true);
    } else if (verified === "false") {
      setIsVerified(false);
    } else {
      setShowModal(true);
    }
  }, []);

  const handleYes = () => {
    localStorage.setItem("age-verified", "true");
    setIsVerified(true);
    setShowModal(false);
  };

  const handleNo = () => {
    localStorage.setItem("age-verified", "false");
    setIsVerified(false);
    setShowModal(false);
  };

  // User denied - show blocked message
  if (isVerified === false) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Image
            src="/logo.png"
            alt="Healing Room"
            width={80}
            height={80}
            className="mx-auto mb-6 opacity-50"
          />
          <h1 className="text-2xl font-light text-text-primary mb-4">
            Sorry, you must be 19+ to visit
          </h1>
          <p className="text-text-muted mb-8 leading-relaxed">
            This website contains content related to products which are only 
            available to those 19 years of age or older. Please come back when you&apos;re of legal age.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("age-verified");
              setIsVerified(null);
              setShowModal(true);
            }}
            className="text-sm text-text-light hover:text-primary transition-colors"
          >
            I made a mistake, let me verify again
          </button>
        </div>
      </div>
    );
  }

  // Show verification modal
  if (showModal) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl">
          <Image
            src="/logo.png"
            alt="Healing Room"
            width={70}
            height={70}
            className="mx-auto mb-6"
          />
          <h2 className="text-xl font-medium text-text-primary mb-2">
            Age Verification
          </h2>
          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            You must be 19 years of age or older to enter this website. 
            Please confirm your age to continue.
          </p>
          
          <p className="text-lg font-medium text-text-primary mb-6">
            Are you 19 or older?
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={handleYes}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Yes, I am
            </button>
            <button
              onClick={handleNo}
              className="flex-1 bg-gray-100 text-text-muted py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              No, I&apos;m not
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified - render nothing
  return null;
}

