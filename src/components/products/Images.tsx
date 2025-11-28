"use client";

import React, { useState } from "react";
import Image, { ImageLoader } from "next/image";
import { Skeleton } from "../ui/skeleton";

const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => {
  const params = [
    "f_auto",
    "c_limit",
    "w_" + width,
    "q_" + (quality || "auto"),
  ];
  const normalizeSrc = (src: string) => (src[0] === "/" ? src.slice(1) : src);

  return `https://res.cloudinary.com/${
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  }/image/upload/${params.join(",")}/${normalizeSrc(src)}`;
};

// Check if image is a local path
const isLocalImage = (src: string) => {
  return src.startsWith('/') || src.startsWith('data:');
};

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
  const useCloudinary = !isLocalImage(imageSrc) && imageSrc.includes('cloudinary') && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // If image failed or is fallback, show placeholder
  if (imageError || imageSrc === '/logo.png') {
    return (
      <div className="w-full aspect-[2/3] bg-bg-alt flex items-center justify-center">
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
        loader={useCloudinary ? cloudinaryLoader : undefined}
        width={width}
        height={height}
        src={imageSrc}
        alt={name}
        priority={priority}
        className="w-full max-w-img aspect-[2/3] brightness-90 object-cover"
        onLoad={handleImageLoadComplete}
        onError={handleImageError}
        sizes={sizes}
      />
      {!imageLoaded && (
        <div className="absolute top-0 right-0 w-full aspect-[2/3] bg-bg-alt">
          <Skeleton className="w-full aspect-[2/3] rounded-b-none" />
        </div>
      )}
    </div>
  );
};
