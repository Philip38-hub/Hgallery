// Hedera and application types
export interface WalletConnection {
  accountId: string;
  isConnected: boolean;
  network: string;
}

export interface MediaNFT {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: MediaMetadata;
  ipfsHash: string;
  transactionId: string;
  createdAt: string;
}

export interface MediaMetadata {
  title: string;
  description: string;
  tags: string[];
  mediaType: 'image' | 'video';
  originalFileName: string;
  fileSize: number;
  uploadDate: string;
  creator: string;
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  mediaType?: 'image' | 'video' | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'newest' | 'oldest' | 'title';
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'minting' | 'completed' | 'error';
  error?: string;
}

// Collection and NFT management types
export interface NFTCollection {
  tokenId: string;
  name: string;
  symbol: string;
  totalSupply: number;
  treasuryAccountId: string;
  createdAt: string;
}

export interface UserProfile {
  accountId: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  collections: NFTCollection[];
  totalNFTs: number;
  joinedAt: string;
}