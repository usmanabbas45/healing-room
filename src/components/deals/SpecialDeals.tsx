import { getActiveOffers } from "@/app/actions";
import Link from "next/link";

export default async function SpecialDeals() {
  const offers = await getActiveOffers();
  
  // Only show section if we have active offers
  if (!offers || offers.length === 0) {
    return null;
  }

  // Limit to first 3 offers for homepage
  const displayOffers = offers.slice(0, 3);

  return (
    <section className="pt-12 md:pt-16 pb-20 md:pb-28 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Title Photo - Centered at top */}
        <div className="text-center mb-12">
          <div className="inline-block relative">
            {/* Decorative lines */}
            <div className="absolute top-1/2 right-full mr-4 w-16 h-px bg-gradient-to-r from-transparent to-primary hidden md:block" />
            <div className="absolute top-1/2 left-full ml-4 w-16 h-px bg-gradient-to-l from-transparent to-primary hidden md:block" />
            
            <img 
              src="/special-deals-title.png" 
              alt="Special Deals" 
              className="w-72 md:w-80 h-auto"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(211, 115, 48, 0.3))'
              }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 max-w-7xl mx-auto">
          {/* Left Side - Description */}
          <div className="lg:w-2/5 flex items-center justify-center">
            <p className="text-text-light text-lg md:text-xl leading-relaxed text-center">
              Limited time offers on your favorite products. Don't miss out!
            </p>
          </div>

          {/* Right Side - Deal Cards */}
          <div className="lg:w-3/5 flex flex-col gap-6">
          {displayOffers.map((offer) => {
            const startDate = new Date(offer.validFrom);
            const endDate = new Date(offer.validTo);
            const isExpiring = endDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // Less than 7 days
            
            // Determine discount value - use offerValue if available, otherwise offerAmount
            const discountValue = offer.offerValue || offer.offerAmount || 0;

            return (
              <div
                key={offer.id}
                className="group relative bg-white border border-border-primary rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 flex flex-col md:flex-row"
              >
                {/* Accent border on hover */}
                <div className="absolute inset-0 border-2 border-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Discount Badge - Left side on desktop */}
                <div className="relative bg-gradient-to-br from-primary to-[#C77730] p-6 md:p-8 flex items-center justify-center md:w-48 md:flex-shrink-0">
                  {isExpiring && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                      ⏰ ENDING SOON
                    </div>
                  )}
                  
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 left-0 w-16 h-16 bg-white/10 rounded-br-full" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-black/10 rounded-tl-full" />
                  
                  <div className="relative text-white text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1 tracking-tight">
                      {offer.isPercentage ? `${discountValue}%` : `$${discountValue}`}
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] opacity-90 font-medium">
                      {offer.isPercentage ? 'OFF' : 'SAVINGS'}
                    </div>
                  </div>
                </div>

                {/* Offer Details */}
                <div className="p-6 flex-1 flex flex-col bg-gray-50/50">
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {offer.name}
                  </h3>
                  
                  {offer.description && (
                    <p className="text-text-light text-sm leading-relaxed mb-3">
                      {offer.description}
                    </p>
                  )}

                  {/* Applicable Products/Categories */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {(offer.applicableProducts && offer.applicableProducts.length > 0) || 
                     (offer.applicableCategories && offer.applicableCategories.length > 0) ? (
                      <>
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Valid on:
                        </span>
                        
                        {/* Product Images */}
                        {offer.applicableProducts && offer.applicableProducts.length > 0 && (
                          <div className="flex gap-2">
                            {offer.applicableProducts.slice(0, 2).map((product) => (
                              <div key={product.id} className="group/img relative">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-border-primary hover:border-primary transition-colors">
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/img:block z-10 whitespace-nowrap">
                                  <div className="bg-text-primary text-white text-xs px-2 py-1 rounded shadow-lg">
                                    {product.name}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {offer.applicableProducts.length > 2 && (
                              <div className="w-10 h-10 rounded-lg bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                                +{offer.applicableProducts.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Categories */}
                        {offer.applicableCategories && offer.applicableCategories.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {offer.applicableCategories.map((category, idx) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-green-700">Valid on all products</span>
                      </>
                    )}
                  </div>

                  {/* Bottom Row - Date and CTA */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-auto">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Until {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={offer.applicableProducts && offer.applicableProducts.length > 0 
                        ? `/product/${offer.applicableProducts[0].id}` 
                        : "/shop"}
                      className="group/btn sm:ml-auto bg-gradient-to-r from-primary to-[#C77730] text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                    >
                      Shop Now
                      <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* View All Link */}
          {offers.length > 3 && (
            <div className="text-center mt-4">
              <Link
                href="/shop"
                className="group inline-flex items-center gap-3 bg-white border-2 border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-lg text-sm"
              >
                View All Deals
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

