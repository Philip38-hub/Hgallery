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

// HashPack wallet types (simplified for now since the package didn't install)
export interface HashConnectSigner {
  sign: (message: Uint8Array) => Promise<Uint8Array>;
  getAccountId: () => Promise<string>;
}

export interface HashPackConnectionState {
  topic: string;
  pairingString: string;
  savedPairings: any[];
  availableExtensions: any[];
}