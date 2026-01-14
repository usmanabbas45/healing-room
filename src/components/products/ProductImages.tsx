"use client";

import { Skeleton } from "../ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Images } from "./Images";
import { VariantsDocument } from "@/types/types";

interface ProductImages {
  name: string;
  selectedVariant: VariantsDocument | undefined;
}

export const ProductImages = ({ name, selectedVariant }: ProductImages) => {
  if (!selectedVariant || !selectedVariant.images || selectedVariant.images.length === 0) {
    return (
      <Skeleton className="w-full rounded-lg aspect-square min-w-[250px] lg:min-w-[400px]" />
    );
  }

  return (
    <>
      <div className="flex lg:hidden">
        <Carousel
          className="w-full min-w-[250px] overflow-hidden"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {selectedVariant.images.map((image: string, index: number) => (
              <CarouselItem key={index} className="pl-0">
                <Images
                  image={[image]}
                  name={`${name} ${selectedVariant.color} - Image ${index + 1}`}
                  width={384}
                  height={576}
                  priority={index === 0 ? true : false}
                  sizes="(max-width: 994px) 100vw,
                  (max-width: 1304px) 50vw,
                  (max-width: 1500px) 25vw,
                  33vw"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="lg:block hidden">
        <Images
          image={selectedVariant.images}
          name={name}
          width={400}
          height={600}
          priority={true}
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
      </div>
    </>
  );
};
