import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LazyWalletProvider } from "@/components/lazy/LazyWalletProvider";
import { LazyIndex, LazyMintNFT, LazyNotFound } from "@/components/lazy/LazyPages";
import { PageLoader } from "@/components/ui/page-loader";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LazyWalletProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<PageLoader message="Loading gallery..." />}>
                  <LazyIndex />
                </Suspense>
              }
            />
            <Route
              path="/mint"
              element={
                <Suspense fallback={<PageLoader message="Loading minting interface..." />}>
                  <LazyMintNFT />
                </Suspense>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoader message="Loading page..." />}>
                  <LazyNotFound />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </LazyWalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
