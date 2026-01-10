import { Loader } from "@/components/common/Loader";

export default function ShopLoading() {
  return (
    <section className="pt-4">
      {/* Page Header Skeleton */}
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
      
      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="h-10 flex-1 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-100 rounded animate-pulse" />
      </div>
      
      {/* Loading Spinner */}
      <div className="flex flex-col items-center justify-center py-20">
        <Loader height={48} width={48} />
        <p className="mt-4 text-text-muted text-sm">Loading products...</p>
      </div>
    </section>
  );
}
