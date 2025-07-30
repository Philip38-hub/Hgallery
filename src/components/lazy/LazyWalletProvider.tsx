import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load the WalletProvider to reduce initial bundle size
const WalletProvider = lazy(() => 
  import('@/contexts/WalletContext').then(module => ({ 
    default: module.WalletProvider 
  }))
);

interface LazyWalletProviderProps {
  children: React.ReactNode;
}

const WalletLoadingFallback = () => (
  <div className="min-h-screen bg-gradient-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground">Initializing wallet connection...</p>
    </div>
  </div>
);

export const LazyWalletProvider: React.FC<LazyWalletProviderProps> = ({ children }) => {
  return (
    <Suspense fallback={<WalletLoadingFallback />}>
      <WalletProvider>
        {children}
      </WalletProvider>
    </Suspense>
  );
};
