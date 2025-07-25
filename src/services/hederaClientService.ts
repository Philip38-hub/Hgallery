import {
  Client,
  AccountId,
  TokenInfoQuery,
  AccountBalanceQuery,
  TokenNftInfoQuery,
  NftId,
  TokenId,
} from '@hashgraph/sdk';

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  totalSupply: string;
  treasuryAccountId: string;
}

export interface NFTInfo {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: any;
  createdAt: string;
}

export interface AccountBalance {
  hbars: string;
  tokens: Map<string, number>;
}

/**
 * Client-side Hedera service for read-only operations
 * This service doesn't require private keys and is safe for browser use
 */
export class HederaClientService {
  private client: Client;

  constructor() {
    const network = import.meta.env.VITE_HEDERA_NETWORK || 'testnet';

    if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    try {
      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(this.client);

      return {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasuryAccountId: tokenInfo.treasuryAccountId.toString()
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }

  async getNFTInfo(tokenId: string, serialNumber: number): Promise<NFTInfo> {
    try {
      const nftInfo = await new TokenNftInfoQuery()
        .setNftId(new NftId(TokenId.fromString(tokenId), serialNumber))
        .execute(this.client);

      if (nftInfo.length === 0) {
        throw new Error('NFT not found');
      }

      const nft = nftInfo[0];
      const metadataString = new TextDecoder().decode(nft.metadata);
      
      // Check if metadata is a URL or JSON
      let metadata;
      if (metadataString.startsWith('ipfs://') || metadataString.startsWith('http')) {
        // Metadata is a URL pointing to the actual metadata
        metadata = { metadataUrl: metadataString };
      } else {
        try {
          // Try to parse as JSON
          metadata = JSON.parse(metadataString);
        } catch {
          // If parsing fails, treat as plain text
          metadata = { raw: metadataString };
        }
      }

      return {
        tokenId,
        serialNumber,
        accountId: nft.accountId.toString(),
        metadata,
        createdAt: nft.creationTime.toDate().toISOString()
      };
    } catch (error) {
      console.error('Error getting NFT info:', error);
      throw error;
    }
  }

  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(this.client);

      return {
        hbars: balance.hbars.toString(),
        tokens: balance.tokens
      };
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  // Check if an account is already associated with a token
  async isTokenAssociated(tokenId: string, accountId: string): Promise<boolean> {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(this.client);

      // Check if the token exists in the account's token map
      return balance.tokens.has(TokenId.fromString(tokenId));
    } catch (error) {
      console.error('Error checking token association:', error);
      return false;
    }
  }
}

export const hederaClientService = new HederaClientService();
