import { lazy } from 'react';

// Lazy load heavy pages to improve initial load time
export const LazyIndex = lazy(() => import('@/pages/Index'));
export const LazyMintNFT = lazy(() => import('@/pages/MintNFT').then(module => ({ 
  default: module.MintNFT 
})));
export const LazyNotFound = lazy(() => import('@/pages/NotFound'));
