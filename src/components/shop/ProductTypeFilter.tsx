"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ProductType {
  id: string;
  name: string;
  count?: number;
}

export function ProductTypeFilter({ 
  currentType,
  productTypes,
}: { 
  currentType: string;
  productTypes: ProductType[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (typeId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (typeId === 'all') {
      params.delete('type');
    } else {
      params.set('type', typeId);
    }
    
    // Reset to page 1 when changing filter
    params.delete('page');
    
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <label htmlFor="type-select" className="text-sm font-medium text-text-muted whitespace-nowrap">
        Filter:
      </label>
      <div className="relative">
        <select
          id="type-select"
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="appearance-none bg-white border border-border-primary rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        >
          {productTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}{type.count ? ` (${type.count})` : ''}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
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
      
      {/* Clear filter button when not "all" */}
      {currentType !== 'all' && (
        <button
          onClick={() => handleTypeChange('all')}
          className="p-1.5 text-text-muted hover:text-primary hover:bg-gray-100 rounded transition-colors"
          title="Clear filter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

