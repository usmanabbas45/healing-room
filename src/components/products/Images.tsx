"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";

// Check if image URL is valid
const isValidImageUrl = (src: string) => {
  if (!src || typeof src !== 'string') return false;
  return src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:');
};

export const Images = ({
  image,
  name,
  width,
  height,
  priority,
  sizes,
}: {
  image: string[];
  name: string;
  width: number;
  height: number;
  priority: boolean;
  sizes: string;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoadComplete = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Stop showing skeleton
  };

  const rawSrc = image?.[0] || '/logo.png';
  // Validate the image URL - fallback to logo if invalid
  const imageSrc = isValidImageUrl(rawSrc) ? rawSrc : '/logo.png';

  // If image failed or is fallback, show placeholder
  if (imageError || imageSrc === '/logo.png') {
    return (
      <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center">
        <Image
          src="/logo.png"
          alt={name}
          width={120}
          height={120}
          className="opacity-30"
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className={!imageLoaded ? "relative" : ""}>
      <Image
        width={width}
        height={height}
        src={imageSrc}
        alt={name}
        priority={priority}
        className="w-full max-w-img aspect-square brightness-95 object-contain bg-white rounded-lg"
        onLoad={handleImageLoadComplete}
        onError={handleImageError}
        sizes={sizes}
      />
      {!imageLoaded && (
        <div className="absolute top-0 right-0 w-full aspect-square bg-white rounded-lg">
          <Skeleton className="w-full aspect-square rounded-lg" />
        </div>
      )}
    </div>
  );
};
