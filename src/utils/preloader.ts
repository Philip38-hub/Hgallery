// Preloader utility to improve perceived performance
export class Preloader {
  private static preloadedChunks = new Set<string>();

  // Preload critical chunks when user shows intent to interact
  static preloadWalletChunks() {
    if (this.preloadedChunks.has('wallet')) return;
    
    this.preloadedChunks.add('wallet');
    
    // Preload wallet-related chunks
    import('@/contexts/WalletContext').catch(console.error);
    import('@/services/hashConnectService').catch(console.error);
  }

  static preloadHederaChunks() {
    if (this.preloadedChunks.has('hedera')) return;
    
    this.preloadedChunks.add('hedera');
    
    // Preload Hedera SDK chunks
    import('@/services/hederaService').catch(console.error);
  }

  static preloadMintingChunks() {
    if (this.preloadedChunks.has('minting')) return;
    
    this.preloadedChunks.add('minting');
    
    // Preload minting-related chunks
    import('@/pages/MintNFT').catch(console.error);
    import('@/components/upload/UploadModal').catch(console.error);
    import('@/services/nftMintingService').catch(console.error);
  }

  // Preload chunks based on user interaction patterns
  static onWalletButtonHover() {
    this.preloadWalletChunks();
  }

  static onMintButtonHover() {
    this.preloadMintingChunks();
    this.preloadHederaChunks();
  }

  static onGalleryInteraction() {
    this.preloadHederaChunks();
  }

  // Preload all chunks after initial page load (low priority)
  static preloadAllChunks() {
    // Use requestIdleCallback if available, otherwise setTimeout
    const preload = () => {
      this.preloadWalletChunks();
      this.preloadHederaChunks();
      this.preloadMintingChunks();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 5000 });
    } else {
      setTimeout(preload, 2000);
    }
  }
}
