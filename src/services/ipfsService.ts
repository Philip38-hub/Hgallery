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

  constructor() {
    const jwt = import.meta.env.VITE_PINATA_JWT;
    this.gatewayUrl = import.meta.env.VITE_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

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