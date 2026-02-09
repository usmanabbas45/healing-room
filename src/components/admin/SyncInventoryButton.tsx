'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function SyncInventoryButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('✅ Inventory synced successfully!');
        // Refresh the page to show updated product count
        window.location.reload();
      } else {
        toast.error(`❌ Sync failed: ${data.message || data.error}`);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('❌ Failed to sync inventory');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={`bg-white border border-border-primary text-text-primary px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
        isSyncing
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:bg-gray-50'
      }`}
    >
      <svg
        className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isSyncing ? 'Syncing...' : 'Sync Inventory'}
    </button>
  );
}
