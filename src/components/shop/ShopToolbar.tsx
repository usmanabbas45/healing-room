"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProductType {
  id: string;
  name: string;
  count?: number;
}

export function ShopToolbar({ 
  currentType,
  currentSearch,
  productTypes,
  totalCount,
}: { 
  currentType: string;
  currentSearch: string;
  productTypes: ProductType[];
  totalCount: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback((updates: { type?: string; q?: string; clearPage?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.type !== undefined) {
      if (updates.type === 'all') {
        params.delete('type');
      } else {
        params.set('type', updates.type);
      }
    }
    
    if (updates.q !== undefined) {
      if (updates.q === '') {
        params.delete('q');
      } else {
        params.set('q', updates.q);
      }
    }
    
    if (updates.clearPage) {
      params.delete('page');
    }
    
    const queryString = params.toString();
    router.push(`/shop${queryString ? `?${queryString}` : ''}`);
  }, [router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchValue.trim(), clearPage: true });
  };

  const handleTypeChange = (typeId: string) => {
    updateParams({ type: typeId, clearPage: true });
  };

  const clearSearch = () => {
    setSearchValue('');
    updateParams({ q: '', clearPage: true });
  };

  return (
    <div className="bg-gradient-to-b from-bg-alt/50 to-transparent">
      <div className="px-4 py-6">
        {/* Search and Filter Row */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg
                  className="w-5 h-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-12 pr-24 py-3 bg-white border border-border-primary rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                {searchValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-muted">Category:</span>
              <div className="relative">
                <select
                  value={currentType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="appearance-none bg-white border border-border-primary rounded-xl pl-4 pr-10 py-3 text-sm text-text-primary font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[160px]"
                >
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}{type.count ? ` (${type.count})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg 
                    className="w-4 h-4 text-text-muted" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Active Filters / Results Summary */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Results count - only show when loaded */}
          {totalCount !== null && (
            <span className="text-sm text-text-muted">
              {totalCount > 0 ? `${totalCount} products` : 'No products found'}
            </span>
          )}

          {/* Active filter tags */}
          {(currentSearch || currentType !== 'all') && (
            <>
              <span className="text-text-muted">•</span>
              <div className="flex flex-wrap items-center gap-2">
                {currentSearch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    &quot;{currentSearch}&quot;
                    <button
                      onClick={clearSearch}
                      className="ml-0.5 hover:text-primary-dark"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {currentType !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {productTypes.find(t => t.id === currentType)?.name || currentType}
                    <button
                      onClick={() => handleTypeChange('all')}
                      className="ml-0.5 hover:text-primary-dark"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

