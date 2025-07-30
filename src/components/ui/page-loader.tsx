import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-primary/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Hedera Gallery</h3>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
};
