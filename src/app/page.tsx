import Image from "next/image";
import Link from "next/link";
import { ContactButton } from "@/components/contact/ContactButton";
import InteractiveMap from "@/components/map/InteractiveMap";
import { FAQJsonLd } from "@/components/seo/JsonLd";

// FAQ data for SEO
const faqs = [
  {
    question: "What are your hours of operation?",
    answer: "Healing Room is open 7 days a week from 9:00 AM to 10:00 PM, including holidays.",
  },
  {
    question: "Where is Healing Room located?",
    answer: "We are located at 7147 Indian Line Rd, Norfolk County, ON N0E 1Z0 in Six Nations, Ontario, Canada.",
  },
  {
    question: "What age do I need to be to enter?",
    answer: "You must be 19 years or older to enter and purchase products from Healing Room.",
  },
  {
    question: "What types of products do you sell?",
    answer: "We offer a wide variety of cannabis products including flower (indica, sativa, hybrid), pre-rolls, edibles, vapes, concentrates, CBD products, and tobacco accessories.",
  },
  {
    question: "Are your products lab tested?",
    answer: "Yes, all our cannabis products are rigorously lab tested for purity, potency, and safety. Certificates of Analysis are available upon request.",
  },
  {
    question: "Do you offer delivery?",
    answer: "Please contact us at (365) 336-7919 or email info@healingroomsixnations.ca to inquire about delivery options.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept cash, debit cards, credit cards, and e-transfer payments.",
  },
];

export default function Home() {
  return (
    <>
      <FAQJsonLd faqs={faqs} />
      <main className="min-h-screen bg-white">
      {/* Hero Section - Stunning full viewport with layered design */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden">
        {/* Background with gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fdfcfa] via-white to-[#f8f5f0]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-amber-200/10 rounded-full blur-3xl" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(#2D2D2D 1px, transparent 1px), linear-gradient(90deg, #2D2D2D 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        
        <div className="relative z-10 container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-text-primary tracking-tight mb-6 leading-[1.1]">
                Premium
                <span className="block text-primary">Cannabis</span>
                <span className="block">&amp; Tobacco</span>
              </h1>
              
              <p className="text-lg md:text-xl text-text-light max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Discover our carefully curated selection of premium products. 
                Quality you can trust, service you deserve.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-12">
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-full text-sm tracking-wider uppercase font-medium hover:bg-primary-dark hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/25"
                >
                  Shop Now
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#categories"
                  className="inline-flex items-center gap-2 text-text-primary px-8 py-4 text-sm tracking-wider uppercase font-medium hover:text-primary transition-colors duration-300"
                >
                  Explore Products
                </a>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-8 text-sm text-text-muted">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Lab Tested</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>500+ Products</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Open Daily</span>
                </div>
              </div>
            </div>
            
            {/* Right - Hero Image/Visual */}
            <div className="order-1 lg:order-2 relative pt-8 md:pt-0 w-full">
              <div className="relative aspect-square max-w-[280px] sm:max-w-sm md:max-w-lg mx-auto">
                {/* Background shadow layer for depth */}
                <div className="absolute inset-4 bg-black/20 rounded-3xl blur-2xl transform translate-y-4" />
                
                {/* Outer frame - creates 3D border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#c4beb5] via-[#b8b0a5] to-[#a89f94] rounded-3xl p-[3px]"
                  style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset' }}>
                  
                  {/* Inner container with inset shadow for depth */}
                  <div className="relative w-full h-full bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] rounded-[21px] overflow-hidden"
                    style={{ boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.1), inset 0 -2px 10px rgba(255,255,255,0.5)' }}>
                    
                    {/* Top highlight for 3D effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-[21px]" />
                    
                    {/* Subtle texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`
                    }} />
                    
                    {/* Logo container with glow */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-8 relative">
                        {/* Glow behind logo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                        
                        {/* Logo with drop shadow */}
                        <div className="relative" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}>
                          <Image
                            src="/logo.png"
                            alt="Healing Room"
                            width={200}
                            height={200}
                            className="mx-auto mb-6"
                            priority
                          />
                        </div>
                        <p className="text-text-primary/50 text-sm tracking-[0.2em] uppercase font-medium">Premium Quality</p>
                      </div>
                    </div>
                    
                    {/* Bottom shadow for depth */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/[0.08] to-transparent" />
                    
                    {/* Corner accents */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/20 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/20 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-black/[0.08] rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-black/[0.08] rounded-br-lg" />
                  </div>
                </div>
                
                
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator - hidden on mobile */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-text-muted tracking-widest uppercase">Explore</span>
          <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Awards / As Featured In Section */}
      <section className="py-12 md:py-16 bg-white border-y border-border-primary/30">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-text-muted mb-8 tracking-wide">
            Voted Best Online Dispensary in Canada
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <Image
              src="/awards/logo-leafly.png.webp"
              alt="Leafly"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-weed-maps.png.webp"
              alt="Weedmaps"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-daily-hive.png"
              alt="Daily Hive"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-cannaibs-net.png.avif"
              alt="Cannabis.net"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-cculture.png.avif"
              alt="Cannabis Culture"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-weed-blog.png.avif"
              alt="Weed Blog"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/awards/logo-kmapper.png.avif"
              alt="KMapper"
              width={100}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* Product Categories Section */}
      <section id="categories" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-primary uppercase mb-4">Our Selection</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">
              Shop by Category
            </h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Explore our diverse range of premium cannabis and tobacco products, 
              carefully sourced for quality and potency.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Indica */}
            <Link href="/shop?type=indica" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/indica.png"
                  alt="Indica"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Indica</h3>
                <p className="text-xs text-text-muted mt-1">Relax & Unwind</p>
              </div>
            </Link>
            
            {/* Sativa */}
            <Link href="/shop?type=sativa" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/sativa.png"
                  alt="Sativa"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Sativa</h3>
                <p className="text-xs text-text-muted mt-1">Energize & Create</p>
              </div>
            </Link>
            
            {/* Hybrid */}
            <Link href="/shop?type=hybrid-indica-dominant" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/hybrid.png"
                  alt="Hybrid"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Hybrid</h3>
                <p className="text-xs text-text-muted mt-1">Best of Both</p>
              </div>
            </Link>
            
            {/* Cannabis */}
            <Link href="/shop?type=cannabis" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/cannabis.png"
                  alt="Cannabis"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Cannabis</h3>
                <p className="text-xs text-text-muted mt-1">All Products</p>
              </div>
            </Link>
            
            {/* Nicotine */}
            <Link href="/shop?type=nicotine" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/nicotine.png"
                  alt="Nicotine"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Nicotine</h3>
                <p className="text-xs text-text-muted mt-1">Tobacco & More</p>
              </div>
            </Link>
            
            {/* Accessories */}
            <Link href="/shop?type=accessories" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/accessories.png"
                  alt="Accessories"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Accessories</h3>
                <p className="text-xs text-text-muted mt-1">Gear & Tools</p>
              </div>
            </Link>
            
            {/* Edibles */}
            <Link href="/shop?type=edibles" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/edibles.png"
                  alt="Edibles"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Edibles</h3>
                <p className="text-xs text-text-muted mt-1">Tasty Treats</p>
              </div>
            </Link>
            
            {/* Vape */}
            <Link href="/shop?type=vape" className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border-primary/20 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="relative aspect-square overflow-hidden flex-shrink-0">
                <Image
                  src="/categories/vape.png"
                  alt="Vape"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 text-center bg-gradient-to-br from-[#f0ece6] via-[#e8e4dd] to-[#ddd8cf] flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-sm md:text-base">Vape</h3>
                <p className="text-xs text-text-muted mt-1">Smooth & Easy</p>
              </div>
            </Link>
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-medium transition-colors"
            >
              View All Products
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - Enhanced with image */}
      <section id="about" className="relative py-24 md:py-32 overflow-hidden">
        {/* Background - fades from transparent at top to cream at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#faf8f5]/50 to-[#f5f2ed]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Image Side */}
            <div className="relative order-2 lg:order-1">
              <div className="relative">
                {/* Store interior image */}
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative">
                  <Image
                    src="/store-interior.webp"
                    alt="Healing Room Store Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Overlapping accent card */}
                <div className="absolute -bottom-8 -right-8 bg-white rounded-2xl shadow-xl p-6 max-w-[240px] border border-border-primary/10">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary mb-1">Six Nations</h4>
                      <p className="text-sm text-text-light">Proudly serving our community</p>
                    </div>
                  </div>
                </div>
                
                {/* Decorative element */}
                <div className="absolute -top-6 -left-6 w-24 h-24 border-2 border-primary/20 rounded-2xl" />
              </div>
            </div>
            
            {/* Content Side */}
            <div className="order-1 lg:order-2">
              <p className="text-xs tracking-[0.3em] text-primary uppercase mb-6">About Us</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-text-primary mb-8 leading-tight">
                Your Trusted Destination for
                <span className="text-primary"> Premium Products</span>
              </h2>
              
              <div className="space-y-6 text-text-light leading-relaxed">
                <p>
                  Located in the heart of Six Nations, Healing Room is committed to providing 
                  our community with the highest quality cannabis and tobacco products available. 
                  We believe in transparency, quality, and exceptional customer service.
                </p>
                <p>
                  Our knowledgeable staff is passionate about helping you find the perfect products 
                  for your needs. Whether you&apos;re a seasoned enthusiast or exploring for the first time, 
                  we&apos;re here to guide you every step of the way.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-border-primary/20">
                <div>
                  <p className="text-3xl md:text-4xl font-light text-primary mb-2">500+</p>
                  <p className="text-sm text-text-muted">Products</p>
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-light text-primary mb-2">7</p>
                  <p className="text-sm text-text-muted">Days Open</p>
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-light text-primary mb-2">4.9</p>
                  <p className="text-sm text-text-muted">Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Minimal & Elegant */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
                Why <span className="text-primary">Healing Room</span>?
              </h2>
              <div className="w-12 h-[2px] bg-primary mx-auto" />
            </div>
            
            {/* Features - Horizontal Layout */}
            <div className="grid md:grid-cols-2 gap-x-20 gap-y-16">
              {/* Feature 1 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-[3px] bg-gradient-to-b from-primary to-primary/20 rounded-full" />
                <div>
                  <h3 className="text-xl font-medium text-text-primary mb-3">Lab Tested Quality</h3>
                  <p className="text-text-light leading-relaxed">
                    Every product undergoes rigorous testing for purity, potency, and safety. 
                    We provide Certificates of Analysis on request because transparency matters.
                  </p>
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-[3px] bg-gradient-to-b from-primary to-primary/20 rounded-full" />
                <div>
                  <h3 className="text-xl font-medium text-text-primary mb-3">Knowledgeable Team</h3>
                  <p className="text-text-light leading-relaxed">
                    Our staff doesn&apos;t just sell products — they understand them. Get personalized 
                    recommendations based on your preferences and wellness goals.
                  </p>
                </div>
              </div>
              
              {/* Feature 3 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-[3px] bg-gradient-to-b from-primary to-primary/20 rounded-full" />
                <div>
                  <h3 className="text-xl font-medium text-text-primary mb-3">Fair, Honest Pricing</h3>
                  <p className="text-text-light leading-relaxed">
                    Quality shouldn&apos;t break the bank. We keep our prices competitive and 
                    run regular promotions because everyone deserves access to good products.
                  </p>
                </div>
              </div>
              
              {/* Feature 4 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-[3px] bg-gradient-to-b from-primary to-primary/20 rounded-full" />
                <div>
                  <h3 className="text-xl font-medium text-text-primary mb-3">Rooted in Community</h3>
                  <p className="text-text-light leading-relaxed">
                    We&apos;re proud to serve Six Nations. This isn&apos;t just business — it&apos;s about 
                    supporting our neighbors with respect, integrity, and genuine care.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section - Google Reviews Style Carousel */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-[#faf8f5] to-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-primary uppercase mb-4">Customer Reviews</p>
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              What Our Customers Say
            </h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          
          {/* Infinite Carousel */}
          <div className="relative carousel-fade-container pb-4">
            <div className="infinite-carousel-track py-4">
              {/* 15 Google-style review cards */}
              {[
                { name: "Mike Thompson", time: "2 weeks ago", initial: "M", color: "#4285F4", text: "Best dispensary in the area! The staff is incredibly knowledgeable and always helps me find exactly what I need. Quality products at fair prices." },
                { name: "Sarah Lewis", time: "1 month ago", initial: "S", color: "#EA4335", text: "Love the atmosphere and the selection here. The team really takes the time to explain different products and their effects. Highly recommend!" },
                { name: "James Rodriguez", time: "3 weeks ago", initial: "J", color: "#34A853", text: "Finally, a local spot that gets it right! Great variety, competitive prices, and the friendliest staff around. My go-to dispensary now." },
                { name: "Ashley Kim", time: "1 week ago", initial: "A", color: "#FBBC05", text: "Was nervous as a first-timer but the staff made me feel so comfortable. They answered all my questions and helped me find the perfect product." },
                { name: "David Martinez", time: "2 months ago", initial: "D", color: "#4285F4", text: "The quality here is unmatched. I've tried other places but keep coming back. The rewards program is great too!" },
                { name: "Rachel Patel", time: "1 month ago", initial: "R", color: "#EA4335", text: "They really understand medicinal needs. The staff took time to understand my condition and recommend the right products. Life-changing!" },
                { name: "Chris Wilson", time: "3 days ago", initial: "C", color: "#34A853", text: "Clean store, great vibes, amazing selection. The budtenders here actually know their stuff. Will definitely be back!" },
                { name: "Jennifer Brown", time: "2 weeks ago", initial: "J", color: "#FBBC05", text: "Hands down the best customer service I've experienced. They remember my name and preferences every time I visit." },
                { name: "Marcus Johnson", time: "1 week ago", initial: "M", color: "#4285F4", text: "Great prices and even better quality. The flower is always fresh and the edibles selection is incredible." },
                { name: "Emily Davis", time: "4 weeks ago", initial: "E", color: "#EA4335", text: "Super friendly environment. I love that they take the time to educate customers. Not pushy at all." },
                { name: "Tyler Chen", time: "5 days ago", initial: "T", color: "#34A853", text: "This place has become my regular spot. Best selection in Six Nations, no question about it." },
                { name: "Amanda White", time: "2 weeks ago", initial: "A", color: "#FBBC05", text: "The convenience and quality keep me coming back. Staff is always helpful and patient with questions." },
                { name: "Kevin O'Brien", time: "1 month ago", initial: "K", color: "#4285F4", text: "Excellent variety of products. From flower to concentrates to edibles - they have it all. Top notch!" },
                { name: "Lisa Nguyen", time: "3 weeks ago", initial: "L", color: "#EA4335", text: "Been coming here for months. Consistent quality, fair prices, and the staff treats you like family." },
                { name: "Brandon Hill", time: "1 week ago", initial: "B", color: "#34A853", text: "Found my new favorite dispensary! Clean, professional, and they really care about their customers." },
              ].map((review, idx) => (
                <div
                  key={`first-${idx}`}
                  className="flex-shrink-0 w-[320px] bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-all duration-300"
                  style={{ boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)' }}
                >
                  {/* Header with avatar and name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                      style={{ backgroundColor: review.color }}
                    >
                      {review.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{review.name}</p>
                      <p className="text-xs text-text-muted">{review.time}</p>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  
                  {/* Star rating */}
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-[#FBBC05]">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  
                  {/* Review text */}
                  <p className="text-text-primary text-sm leading-relaxed line-clamp-4">
                    {review.text}
                  </p>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {[
                { name: "Mike Thompson", time: "2 weeks ago", initial: "M", color: "#4285F4", text: "Best dispensary in the area! The staff is incredibly knowledgeable and always helps me find exactly what I need. Quality products at fair prices." },
                { name: "Sarah Lewis", time: "1 month ago", initial: "S", color: "#EA4335", text: "Love the atmosphere and the selection here. The team really takes the time to explain different products and their effects. Highly recommend!" },
                { name: "James Rodriguez", time: "3 weeks ago", initial: "J", color: "#34A853", text: "Finally, a local spot that gets it right! Great variety, competitive prices, and the friendliest staff around. My go-to dispensary now." },
                { name: "Ashley Kim", time: "1 week ago", initial: "A", color: "#FBBC05", text: "Was nervous as a first-timer but the staff made me feel so comfortable. They answered all my questions and helped me find the perfect product." },
                { name: "David Martinez", time: "2 months ago", initial: "D", color: "#4285F4", text: "The quality here is unmatched. I've tried other places but keep coming back. The rewards program is great too!" },
                { name: "Rachel Patel", time: "1 month ago", initial: "R", color: "#EA4335", text: "They really understand medicinal needs. The staff took time to understand my condition and recommend the right products. Life-changing!" },
                { name: "Chris Wilson", time: "3 days ago", initial: "C", color: "#34A853", text: "Clean store, great vibes, amazing selection. The budtenders here actually know their stuff. Will definitely be back!" },
                { name: "Jennifer Brown", time: "2 weeks ago", initial: "J", color: "#FBBC05", text: "Hands down the best customer service I've experienced. They remember my name and preferences every time I visit." },
                { name: "Marcus Johnson", time: "1 week ago", initial: "M", color: "#4285F4", text: "Great prices and even better quality. The flower is always fresh and the edibles selection is incredible." },
                { name: "Emily Davis", time: "4 weeks ago", initial: "E", color: "#EA4335", text: "Super friendly environment. I love that they take the time to educate customers. Not pushy at all." },
                { name: "Tyler Chen", time: "5 days ago", initial: "T", color: "#34A853", text: "This place has become my regular spot. Best selection in Six Nations, no question about it." },
                { name: "Amanda White", time: "2 weeks ago", initial: "A", color: "#FBBC05", text: "The convenience and quality keep me coming back. Staff is always helpful and patient with questions." },
                { name: "Kevin O'Brien", time: "1 month ago", initial: "K", color: "#4285F4", text: "Excellent variety of products. From flower to concentrates to edibles - they have it all. Top notch!" },
                { name: "Lisa Nguyen", time: "3 weeks ago", initial: "L", color: "#EA4335", text: "Been coming here for months. Consistent quality, fair prices, and the staff treats you like family." },
                { name: "Brandon Hill", time: "1 week ago", initial: "B", color: "#34A853", text: "Found my new favorite dispensary! Clean, professional, and they really care about their customers." },
              ].map((review, idx) => (
                <div
                  key={`second-${idx}`}
                  className="flex-shrink-0 w-[320px] bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-all duration-300"
                  style={{ boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)' }}
                >
                  {/* Header with avatar and name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                      style={{ backgroundColor: review.color }}
                    >
                      {review.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{review.name}</p>
                      <p className="text-xs text-text-muted">{review.time}</p>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  
                  {/* Star rating */}
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-[#FBBC05]">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  
                  {/* Review text */}
                  <p className="text-text-primary text-sm leading-relaxed line-clamp-4">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visit Section - Enhanced with map */}
      <section className="pt-12 pb-24 md:pt-16 md:pb-32 bg-white overflow-hidden border-t border-border-primary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-primary uppercase mb-4">Visit Us</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">
              Come Say Hello
            </h2>
            <p className="text-text-light max-w-2xl mx-auto">
              Located in Six Nations, we&apos;re easy to find and always ready to help. 
              Stop by and experience our welcoming atmosphere.
            </p>
          </div>
          
          {/* Map with Overlay Info */}
          <div className="relative max-w-4xl mx-auto">
            <InteractiveMap />
          </div>
        </div>
    </section>

      {/* Connect Section - Prominent but Clean */}
      <section className="py-20 md:py-28 bg-[#2D2D2D] relative overflow-hidden">
        {/* Subtle accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Left - Text */}
              <div>
                <p className="text-primary text-sm tracking-wider uppercase mb-4">Stay Connected</p>
                <h2 className="text-3xl md:text-4xl font-light text-white mb-6 leading-tight">
                  Join our community
                </h2>
                <p className="text-white/60 leading-relaxed mb-8">
                  Follow us on social media for the latest product drops, exclusive deals, 
                  and what&apos;s happening at Healing Room.
                </p>
                
                {/* Social Links */}
                <div className="flex items-center gap-4">
                  <a
                    href="https://www.facebook.com/people/Healing-Room-Six-Nations/61582464719082/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <span className="text-sm">Facebook</span>
                  </a>
                  <a
                    href="https://www.instagram.com/healingroomsixnations_/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <span className="text-sm">Instagram</span>
                  </a>
                </div>
              </div>
              
              {/* Right - CTA Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 text-center">
                <h3 className="text-xl font-medium text-white mb-3">Ready to explore?</h3>
                <p className="text-white/50 text-sm mb-8">
                  Browse our full selection of premium cannabis and tobacco products.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
                  <Link
                    href="/shop"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    Shop Collection
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <ContactButton variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-6 py-3 text-sm justify-center" />
                </div>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    19+ Only
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Lab Tested
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Six Nations Owned
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
