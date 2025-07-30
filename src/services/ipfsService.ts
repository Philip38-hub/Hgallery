import { PinataSDK } from 'pinata-web3';

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class IPFSService {
  private pinata: PinataSDK;
  private gatewayUrl: string;
  private fallbackGateways: string[];

  constructor() {
    const jwt = import.meta.env.VITE_PINATA_JWT;
    this.gatewayUrl = import.meta.env.VITE_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

    // Multiple IPFS gateways for fallback and load distribution
    this.fallbackGateways = [
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://dweb.link',
      'https://gateway.pinata.cloud',
      'https://ipfs.filebase.io'
    ];

    if (!jwt) {
      throw new Error('Pinata JWT token not configured');
    }

    this.pinata = new PinataSDK({
      pinataJwt: jwt,
    });
  }

  async uploadFile(file: File): Promise<IPFSUploadResult> {
    try {
      const upload = await this.pinata.upload.file(file);
      
      return {
        hash: upload.IpfsHash,
        url: `${this.gatewayUrl}/ipfs/${upload.IpfsHash}`,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJSON(data: any): Promise<IPFSUploadResult> {
    try {
      const upload = await this.pinata.upload.json(data);
      
      return {
        hash: upload.IpfsHash,
        url: `${this.gatewayUrl}/ipfs/${upload.IpfsHash}`,
        size: JSON.stringify(data).length
      };
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  }

  async uploadMetadata(metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    return this.uploadJSON(metadata);
  }

  async getFile(hash: string): Promise<Response> {
    try {
      const response = await fetch(`${this.gatewayUrl}/ipfs/${hash}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error('Error fetching file from IPFS:', error);
      throw error;
    }
  }

  async getJSON(hash: string): Promise<any> {
    try {
      console.log(`🔍 Fetching JSON from IPFS hash: ${hash}`);
      const response = await this.getFile(hash);
      const jsonData = await response.json();
      console.log(`✅ Successfully fetched JSON from IPFS:`, jsonData);
      return jsonData;
    } catch (error) {
      console.error('Error fetching JSON from IPFS:', error);
      throw error;
    }
  }

  getGatewayUrl(hash: string): string {
    return `${this.gatewayUrl}/ipfs/${hash}`;
  }

  /**
   * Get multiple gateway URLs for a hash (for fallback)
   */
  getGatewayUrls(hash: string): string[] {
    return this.fallbackGateways.map(gateway => `${gateway}/ipfs/${hash}`);
  }

  /**
   * Try to fetch from multiple gateways with fallback
   */
  async getFileWithFallback(hash: string): Promise<Response> {
    const gateways = this.getGatewayUrls(hash);
    let lastError: Error | null = null;

    for (const gatewayUrl of gateways) {
      try {
        console.log(`🔄 Trying IPFS gateway: ${gatewayUrl}`);
        const response = await fetch(gatewayUrl, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        });

        if (response.ok) {
          console.log(`✅ Successfully fetched from: ${gatewayUrl}`);
          return response;
        } else {
          console.warn(`❌ Gateway ${gatewayUrl} failed with status: ${response.status}`);
          lastError = new Error(`Gateway failed with status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ Gateway ${gatewayUrl} error:`, error);
        lastError = error as Error;
        // Continue to next gateway
      }
    }

    throw lastError || new Error('All IPFS gateways failed');
  }

  async pinFile(hash: string): Promise<void> {
    try {
      await this.pinata.pinning.pinByHash(hash);
    } catch (error) {
      console.error('Error pinning file:', error);
      throw error;
    }
  }

  async unpinFile(hash: string): Promise<void> {
    try {
      await this.pinata.pinning.unpin(hash);
    } catch (error) {
      console.error('Error unpinning file:', error);
      throw error;
    }
  }

  async listPinnedFiles(): Promise<any[]> {
    try {
      const files = await this.pinata.pinning.list();
      return files.rows || [];
    } catch (error) {
      console.error('Error listing pinned files:', error);
      throw error;
    }
  }
}

export const ipfsService = new IPFSService();