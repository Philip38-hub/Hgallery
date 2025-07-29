import axios from 'axios';
import { supabaseService } from './supabaseService';

// Handle both browser (Vite) and Node.js environments
const getApiBaseUrl = () => {
  // Browser environment (Vite)
  if (typeof window !== 'undefined') {
    return import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001';
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

    try {
      const response = await axios.get(`${this.baseURL}/api/health`, { timeout: 5000 });
      health.express = true;
      health.expressData = response.data;
    } catch (error) {
      console.warn('Express API health check failed:', error);
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

    // Try Supabase Edge Function first
    if (supabaseService.isAvailable()) {
      try {
        console.log('🔄 Fetching token info via Supabase Edge Function...');
        const result = await supabaseService.callEdgeFunction('hedera-token-info', {
          tokenId,
          includeNFTs: true,
          limit: 50,
          offset: 0
        });

        if (result && result.success) {
          console.log('✅ Token info fetched successfully via Supabase');
          return result;
        }
      } catch (error) {
        console.warn('⚠️ Supabase Edge Function failed, falling back to Express API:', error);
      }
    }

    // Fallback to Express API
    try {
      console.log('🔄 Fetching token info via Express API fallback...');
      const response = await axios.get(`${this.baseURL}/api/token-info`);
      console.log('✅ Token info fetched successfully via Express API');
      return response.data;
    } catch (error) {
      console.error('❌ Both Supabase and Express API failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        error: 'Failed to fetch token information'
      };
    }
  }

  async mintNFT(request: MintNFTRequest): Promise<MintNFTResponse> {
    // Try Supabase Edge Function first
    if (supabaseService.isAvailable()) {
      try {
        console.log('🔄 Attempting to mint NFT via Supabase Edge Function...');
        const result = await supabaseService.mintNFT(request.metadataUrl, request.userAccountId);

        if (result && result.success) {
          console.log('✅ NFT minted successfully via Supabase');
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
    try {
      const response = await axios.get(`${this.baseURL}/api/balance/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting account balance:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
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

    // Try Supabase Edge Function first
    if (supabaseService.isAvailable()) {
      try {
        console.log('🔄 Fetching collection NFTs via Supabase Edge Function...');
        const result = await supabaseService.callEdgeFunction('hedera-token-info', {
          tokenId,
          includeNFTs: true,
          limit,
          offset,
        });

        if (result && result.success) {
          console.log('✅ Collection NFTs fetched successfully via Supabase');
          return result;
        }
      } catch (error) {
        console.warn('⚠️ Supabase Edge Function failed, falling back to Express API:', error);
      }
    }

    // Fallback to Express API
    try {
      console.log('🔄 Fetching collection NFTs via Express API fallback...');
      const response = await axios.get(`${this.baseURL}/api/collection/nfts`, {
        params: { limit, offset }
      });
      console.log('✅ Collection NFTs fetched successfully via Express API');
      return response.data;
    } catch (error) {
      console.error('❌ Both Supabase and Express API failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        error: 'Failed to fetch collection NFTs'
      };
    }
  }
}

export const backendService = new BackendService();
