import axios from 'axios';
import { supabaseService } from './supabaseService';
import { cacheService } from './cacheService';

// Handle both browser (Vite) and Node.js environments
const getApiBaseUrl = () => {
  // Browser environment (Vite)
  if (typeof window !== 'undefined') {
    // In production, if no API URL is set, return empty string to skip Express API calls
    const apiUrl = import.meta.env?.VITE_API_BASE_URL;
    return apiUrl || (import.meta.env.PROD ? '' : 'http://localhost:3001');
  }
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }
  // Fallback
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

export interface MintNFTRequest {
  metadataUrl: string;
  userAccountId?: string;
}

export interface MintNFTResponse {
  success: boolean;
  data?: {
    transactionId: string;
    serialNumber: number;
    tokenId: string;
    metadataUrl: string;
    owner: string;
    transferred: boolean;
    transferTransactionId?: string;
  };
  error?: string;
  details?: string;
}

export interface TransferNFTRequest {
  serialNumber: number;
  toAccountId: string;
}

export interface TransferNFTResponse {
  success: boolean;
  data?: {
    transactionId: string;
    tokenId: string;
    serialNumber: number;
    from: string;
    to: string;
  };
  error?: string;
  details?: string;
}

export interface TokenInfoResponse {
  success: boolean;
  data?: {
    tokenId: string;
    name: string;
    symbol: string;
    totalSupply: string;
    treasuryAccountId: string;
  };
  error?: string;
}

export interface NFTInfoResponse {
  success: boolean;
  data?: {
    tokenId: string;
    serialNumber: number;
    accountId: string;
    metadata: any;
    createdAt: string;
  };
  error?: string;
}

export interface AccountBalanceResponse {
  success: boolean;
  data?: {
    hbars: string;
    tokens: any;
  };
  error?: string;
}

export interface CollectionNFTsResponse {
  success: boolean;
  data?: {
    nfts: Array<{
      tokenId: string;
      serialNumber: number;
      accountId: string;
      metadata: any;
      createdAt: string;
    }>;
    totalSupply: number;
    hasMore: boolean;
    offset: number;
    limit: number;
  };
  error?: string;
}

export class BackendService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async healthCheck(): Promise<any> {
    const health = {
      supabase: supabaseService.isAvailable(),
      express: false,
      expressData: null as any,
    };

    // Try Express API health check if URL is configured
    if (this.baseURL) {
      try {
        const response = await axios.get(`${this.baseURL}/api/health`, { timeout: 5000 });
        health.express = true;
        health.expressData = response.data;
      } catch (error) {
        console.warn('Express API health check failed:', error);
      }
    } else {
      console.log('⚠️ No Express API URL configured');
    }

    return {
      success: health.supabase || health.express,
      services: health,
    };
  }

  async getTokenInfo(): Promise<TokenInfoResponse> {
    const tokenId = import.meta.env.VITE_NFT_COLLECTION_ID;

    if (!tokenId) {
      return {
        success: false,
        error: 'NFT Collection ID not configured'
      };
    }

    // Use cache to avoid repeated API calls
    const cacheKey = `token-info-${tokenId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      // Try Supabase Edge Function first (direct fetch)
      try {
        console.log('🔄 Fetching token info via Supabase Edge Function (direct)...');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const response = await fetch(`${supabaseUrl}/functions/v1/hedera-mirror-nfts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokenId,
              includeNFTs: true,
              limit: 50,
              offset: 0
            })
          });

          console.log('📋 Direct fetch response status:', response.status);
          console.log('📋 Direct fetch response headers:', Object.fromEntries(response.headers.entries()));

          if (response.ok) {
            const result = await response.json();
            console.log('📋 Direct fetch result:', result);

            if (result && result.success) {
              console.log('✅ Token info fetched successfully via direct fetch');
              return result;
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Direct fetch failed with status:', response.status, errorText);
          }
        }
      } catch (error) {
        console.error('❌ Direct fetch failed:', error);
      }

      // Fallback: Try Supabase client
      if (supabaseService.isAvailable()) {
        try {
          console.log('🔄 Fetching token info via Supabase client...');
          const result = await supabaseService.callEdgeFunction('hedera-mirror-nfts', {
            tokenId,
            includeNFTs: true,
            limit: 50,
            offset: 0
          });

          console.log('📋 Supabase client result:', result);

          if (result && result.success) {
            console.log('✅ Token info fetched successfully via Supabase client');
            return result;
          } else {
            console.warn('⚠️ Supabase client returned unsuccessful result:', result);
          }
        } catch (error) {
          console.error('❌ Supabase client failed:', error);
          console.warn('⚠️ Falling back to Express API');
        }
      }

    // Fallback to Express API (only if URL is configured)
    if (this.baseURL) {
      try {
        console.log('🔄 Fetching token info via Express API fallback...');
        const response = await axios.get(`${this.baseURL}/api/token-info`);
        console.log('✅ Token info fetched successfully via Express API');
        return response.data;
      } catch (error) {
        console.error('❌ Express API also failed:', error);
        if (axios.isAxiosError(error) && error.response) {
          return error.response.data;
        }
      }
    } else {
      console.log('⚠️ No Express API URL configured, skipping fallback');
    }

      return {
        success: false,
        error: 'Failed to fetch token information - no backend services available'
      };
    }, 2 * 60 * 1000); // Cache for 2 minutes
  }

  async mintNFT(request: MintNFTRequest): Promise<MintNFTResponse> {
    // Try Supabase Edge Function first
    if (supabaseService.isAvailable()) {
      try {
        console.log('🔄 Attempting to mint NFT via Supabase Edge Function...');
        const result = await supabaseService.mintNFT(request.metadataUrl, request.userAccountId);

        if (result && result.success) {
          console.log('✅ NFT minted successfully via Supabase');

          // Clear relevant cache entries
          const tokenId = import.meta.env.VITE_NFT_COLLECTION_ID;
          if (tokenId) {
            cacheService.delete(`token-info-${tokenId}`);
            // Clear all collection NFT caches
            const stats = cacheService.getStats();
            stats.keys.forEach(key => {
              if (key.startsWith(`collection-nfts-${tokenId}`)) {
                cacheService.delete(key);
              }
            });
            console.log('🗑️ Cleared NFT cache after minting');
          }

          return result;
        }
      } catch (error) {
        console.warn('⚠️ Supabase Edge Function failed, falling back to Express API:', error);
      }
    }

    // Fallback to Express API
    try {
      console.log('🔄 Attempting to mint NFT via Express API fallback...');
      const response = await axios.post(`${this.baseURL}/api/mint-nft`, request);
      console.log('✅ NFT minted successfully via Express API');
      return response.data;
    } catch (error) {
      console.error('❌ Both Supabase and Express API failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  async transferNFT(request: TransferNFTRequest): Promise<TransferNFTResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/transfer-nft`, request);
      return response.data;
    } catch (error) {
      console.error('Error transferring NFT:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  async getNFTInfo(serialNumber: number): Promise<NFTInfoResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/api/nft/${serialNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error getting NFT info:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  async getAccountBalance(accountId: string): Promise<AccountBalanceResponse> {
    // Skip Express API calls in production if no URL is configured
    if (!this.baseURL) {
      console.log('⚠️ No Express API URL configured, skipping account balance check');
      return {
        success: false,
        error: 'Express API not available'
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/api/balance/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting account balance:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        error: 'Failed to get account balance'
      };
    }
  }

  async getCollectionNFTs(limit: number = 100, offset: number = 0): Promise<CollectionNFTsResponse> {
    const tokenId = import.meta.env.VITE_NFT_COLLECTION_ID;

    if (!tokenId) {
      return {
        success: false,
        error: 'NFT Collection ID not configured'
      };
    }

    // Use cache to avoid repeated API calls
    const cacheKey = `collection-nfts-${tokenId}-${limit}-${offset}`;
    return cacheService.getOrSet(cacheKey, async () => {
      // Try Supabase Edge Function first (direct fetch)
      try {
        console.log('🔄 Fetching collection NFTs via Supabase Edge Function (direct)...');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const response = await fetch(`${supabaseUrl}/functions/v1/hedera-mirror-nfts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokenId,
              includeNFTs: true,
              limit,
              offset,
            })
          });

          console.log('📋 Direct fetch response status for collection NFTs:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('📋 Direct fetch result for collection NFTs:', result);

            if (result && result.success) {
              console.log('✅ Collection NFTs fetched successfully via direct fetch');
              return result;
            }
          } else {
            const errorText = await response.text();
            console.error('❌ Direct fetch failed for collection NFTs with status:', response.status, errorText);
          }
        }
      } catch (error) {
        console.error('❌ Direct fetch failed for collection NFTs:', error);
      }

      // Fallback: Try Supabase client
      if (supabaseService.isAvailable()) {
        try {
          console.log('🔄 Fetching collection NFTs via Supabase client...');
          const result = await supabaseService.callEdgeFunction('hedera-mirror-nfts', {
            tokenId,
            includeNFTs: true,
            limit,
            offset,
          });

          console.log('📋 Supabase client result for collection NFTs:', result);

          if (result && result.success) {
            console.log('✅ Collection NFTs fetched successfully via Supabase client');
            return result;
          } else {
            console.warn('⚠️ Supabase client returned unsuccessful result:', result);
          }
        } catch (error) {
          console.error('❌ Supabase client failed for collection NFTs:', error);
          console.warn('⚠️ Falling back to Express API');
        }
      }

    // Fallback to Express API (only if URL is configured)
    if (this.baseURL) {
      try {
        console.log('🔄 Fetching collection NFTs via Express API fallback...');
        const response = await axios.get(`${this.baseURL}/api/collection/nfts`, {
          params: { limit, offset }
        });
        console.log('✅ Collection NFTs fetched successfully via Express API');
        return response.data;
      } catch (error) {
        console.error('❌ Express API also failed:', error);
        if (axios.isAxiosError(error) && error.response) {
          return error.response.data;
        }
      }
    } else {
      console.log('⚠️ No Express API URL configured, skipping fallback');
    }

      return {
        success: false,
        error: 'Failed to fetch collection NFTs - no backend services available'
      };
    }, 1 * 60 * 1000); // Cache for 1 minute
  }
}

export const backendService = new BackendService();
