import axios from 'axios';

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

export class BackendService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      return response.data;
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw new Error('Backend service is not available');
    }
  }

  async getTokenInfo(): Promise<TokenInfoResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/api/token-info`);
      return response.data;
    } catch (error) {
      console.error('Error getting token info:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  async mintNFT(request: MintNFTRequest): Promise<MintNFTResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/mint-nft`, request);
      return response.data;
    } catch (error) {
      console.error('Error minting NFT:', error);
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
}

export const backendService = new BackendService();
