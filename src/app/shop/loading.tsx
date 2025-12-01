export default function ShopLoading() {
  return (
    <section className="pt-14">
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-border-primary rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Text */}
        <p className="text-text-muted text-sm animate-pulse">
          Loading products...
        </p>
      </div>
    </section>
  );
}

