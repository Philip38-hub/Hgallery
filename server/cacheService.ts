import NodeCache from 'node-cache';

export interface CachedNFTData {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: any;
  metadataContent?: any;
  createdAt: string;
  cachedAt: number;
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

export class CacheService {
  private cache: NodeCache;
  private metadataCache: NodeCache;
  private collectionCache: NodeCache;
  
  constructor() {
    // NFT data cache - 1 hour TTL
    this.cache = new NodeCache({ 
      stdTTL: 3600, // 1 hour
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance
    });
    
    // Metadata cache - 6 hours TTL (metadata changes less frequently)
    this.metadataCache = new NodeCache({ 
      stdTTL: 21600, // 6 hours
      checkperiod: 1800, // Check every 30 minutes
      useClones: false
    });
    
    // Collection data cache - 30 minutes TTL
    this.collectionCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes
      checkperiod: 300, // Check every 5 minutes
      useClones: false
    });

    console.log('🗄️ Cache service initialized');
  }

  // NFT Data Caching
  getNFT(tokenId: string, serialNumber: number): CachedNFTData | null {
    const key = `nft:${tokenId}:${serialNumber}`;
    const cached = this.cache.get<CachedNFTData>(key);
    
    if (cached) {
      console.log(`📦 Cache HIT for NFT ${serialNumber}`);
      return cached;
    }
    
    console.log(`📭 Cache MISS for NFT ${serialNumber}`);
    return null;
  }

  setNFT(nftData: CachedNFTData): void {
    const key = `nft:${nftData.tokenId}:${nftData.serialNumber}`;
    nftData.cachedAt = Date.now();
    this.cache.set(key, nftData);
    console.log(`💾 Cached NFT ${nftData.serialNumber}`);
  }

  // Metadata Caching
  getMetadata(ipfsHash: string): any | null {
    const key = `metadata:${ipfsHash}`;
    const cached = this.metadataCache.get(key);
    
    if (cached) {
      console.log(`📦 Cache HIT for metadata ${ipfsHash.substring(0, 8)}...`);
      return cached;
    }
    
    console.log(`📭 Cache MISS for metadata ${ipfsHash.substring(0, 8)}...`);
    return null;
  }

  setMetadata(ipfsHash: string, metadata: any): void {
    const key = `metadata:${ipfsHash}`;
    this.metadataCache.set(key, metadata);
    console.log(`💾 Cached metadata ${ipfsHash.substring(0, 8)}...`);
  }

  // Collection Data Caching
  getCollection(tokenId: string, limit: number, offset: number): any | null {
    const key = `collection:${tokenId}:${limit}:${offset}`;
    const cached = this.collectionCache.get(key);
    
    if (cached) {
      console.log(`📦 Cache HIT for collection ${tokenId} (${limit}/${offset})`);
      return cached;
    }
    
    console.log(`📭 Cache MISS for collection ${tokenId} (${limit}/${offset})`);
    return null;
  }

  setCollection(tokenId: string, limit: number, offset: number, data: any): void {
    const key = `collection:${tokenId}:${limit}:${offset}`;
    this.collectionCache.set(key, data);
    console.log(`💾 Cached collection ${tokenId} (${limit}/${offset})`);
  }

  // Token Info Caching
  getTokenInfo(tokenId: string): any | null {
    const key = `token:${tokenId}`;
    const cached = this.cache.get(key);
    
    if (cached) {
      console.log(`📦 Cache HIT for token info ${tokenId}`);
      return cached;
    }
    
    console.log(`📭 Cache MISS for token info ${tokenId}`);
    return null;
  }

  setTokenInfo(tokenId: string, tokenInfo: any): void {
    const key = `token:${tokenId}`;
    this.cache.set(key, tokenInfo);
    console.log(`💾 Cached token info ${tokenId}`);
  }

  // Cache Management
  invalidateNFT(tokenId: string, serialNumber: number): void {
    const key = `nft:${tokenId}:${serialNumber}`;
    this.cache.del(key);
    console.log(`🗑️ Invalidated cache for NFT ${serialNumber}`);
  }

  invalidateCollection(tokenId: string): void {
    const keys = this.collectionCache.keys();
    const collectionKeys = keys.filter(key => key.startsWith(`collection:${tokenId}:`));
    
    collectionKeys.forEach(key => {
      this.collectionCache.del(key);
    });
    
    console.log(`🗑️ Invalidated ${collectionKeys.length} collection cache entries for ${tokenId}`);
  }

  invalidateAll(): void {
    this.cache.flushAll();
    this.metadataCache.flushAll();
    this.collectionCache.flushAll();
    console.log('🗑️ Cleared all caches');
  }

  // Cache Statistics
  getStats(): CacheStats {
    const cacheStats = this.cache.getStats();
    const metadataStats = this.metadataCache.getStats();
    const collectionStats = this.collectionCache.getStats();
    
    return {
      keys: cacheStats.keys + metadataStats.keys + collectionStats.keys,
      hits: cacheStats.hits + metadataStats.hits + collectionStats.hits,
      misses: cacheStats.misses + metadataStats.misses + collectionStats.misses,
      ksize: cacheStats.ksize + metadataStats.ksize + collectionStats.ksize,
      vsize: cacheStats.vsize + metadataStats.vsize + collectionStats.vsize
    };
  }

  // Preload cache with collection data
  async preloadCollection(
    tokenId: string, 
    totalSupply: number, 
    fetchNFTFunction: (serial: number) => Promise<any>,
    fetchMetadataFunction: (hash: string) => Promise<any>
  ): Promise<void> {
    console.log(`🔄 Preloading cache for collection ${tokenId} (${totalSupply} NFTs)`);
    
    const batchSize = 10; // Process in batches to avoid overwhelming the system
    const batches = Math.ceil(totalSupply / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize + 1;
      const end = Math.min((batch + 1) * batchSize, totalSupply);
      
      console.log(`📦 Processing batch ${batch + 1}/${batches} (NFTs ${start}-${end})`);
      
      const promises = [];
      for (let serial = start; serial <= end; serial++) {
        promises.push(this.preloadSingleNFT(tokenId, serial, fetchNFTFunction, fetchMetadataFunction));
      }
      
      await Promise.allSettled(promises);
      
      // Small delay between batches to avoid rate limiting
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Preloading complete for collection ${tokenId}`);
  }

  private async preloadSingleNFT(
    tokenId: string,
    serial: number,
    fetchNFTFunction: (serial: number) => Promise<any>,
    fetchMetadataFunction: (hash: string) => Promise<any>
  ): Promise<void> {
    try {
      // Check if already cached
      if (this.getNFT(tokenId, serial)) {
        return;
      }
      
      const nftData = await fetchNFTFunction(serial);
      
      // Fetch metadata if available
      if (nftData.metadata?.metadataUrl && nftData.metadata.metadataUrl.startsWith('ipfs://')) {
        const hash = nftData.metadata.metadataUrl.replace('ipfs://', '');
        
        if (!this.getMetadata(hash)) {
          try {
            const metadataContent = await fetchMetadataFunction(hash);
            this.setMetadata(hash, metadataContent);
            nftData.metadataContent = metadataContent;
          } catch (error) {
            console.warn(`⚠️ Failed to preload metadata for NFT ${serial}:`, error);
          }
        } else {
          nftData.metadataContent = this.getMetadata(hash);
        }
      }
      
      this.setNFT(nftData);
    } catch (error) {
      console.warn(`⚠️ Failed to preload NFT ${serial}:`, error);
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
