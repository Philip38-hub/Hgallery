import {
  Client,
  AccountId,
  PrivateKey,
  PublicKey, // Added PublicKey import
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenInfoQuery,
  TransactionResponse,
  TokenId,
  Hbar,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenNftInfoQuery,
  NftId, // Added NftId import
  ContractInfoQuery // Added ContractInfoQuery import
} from '@hashgraph/sdk';
// Server-side only service - requires Node.js environment
import dotenv from 'dotenv';

// Load environment variables for server-side scripts
if (typeof window === 'undefined') {
  dotenv.config();
}

export interface TokenCreationResult {
  tokenId: string;
  transactionId: string;
  serialNumber: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  type: string;
  attributes?: Array<{ // Added attributes to NFTMetadata
    trait_type: string;
    value: string;
  }>;
  properties: {
    creator: string;
    tags: string[];
    originalFileName: string;
    fileSize: number;
    uploadDate: string;
  };
}

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor(operatorId?: string, operatorKey?: string) {
    // This service should only be used server-side with explicit credentials
    // For browser use, use HederaClientService instead
    if (typeof window !== 'undefined') {
      throw new Error('HederaService should not be used in browser environment. Use HederaClientService instead.');
    }

    // In production builds, prevent this service from being instantiated
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      throw new Error('HederaService is not available in production client builds. Use backend API instead.');
    }

    const network = import.meta.env.VITE_HEDERA_NETWORK || 'testnet';
    const opId = operatorId || import.meta.env.VITE_HEDERA_OPERATOR_ID;
    const opKey = operatorKey || import.meta.env.VITE_HEDERA_OPERATOR_KEY;

    if (!opId || !opKey) {
      throw new Error('Hedera operator credentials not configured. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY.');
    }

    this.operatorId = AccountId.fromString(opId);
    this.operatorKey = PrivateKey.fromStringECDSA(opKey);

    if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }

    this.client.setOperator(this.operatorId, this.operatorKey);
  }

  public getOperatorPublicKey(): PublicKey {
    return this.operatorKey.publicKey;
  }

  async createNFTCollection(
    name: string,
    symbol: string,
    treasuryAccountId: string,
    supplyKey?: PrivateKey | PublicKey,
    maxSupply?: number
  ): Promise<string> {
    try {
      // Follow Hedera best practices for NFT collections
      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(maxSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyKey(supplyKey || this.operatorKey)
        .setAdminKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(30));

      // Set max supply if provided (recommended for finite collections)
      if (maxSupply) {
        tokenCreateTx.setMaxSupply(maxSupply);
      }

      tokenCreateTx.freezeWith(this.client);

      const tokenCreateSign = await tokenCreateTx.sign(this.operatorKey);
      const tokenCreateSubmit = await tokenCreateSign.execute(this.client);
      const tokenCreateRx = await tokenCreateSubmit.getReceipt(this.client);

      const tokenId = tokenCreateRx.tokenId;
      if (!tokenId) {
        throw new Error('Failed to create NFT collection');
      }

      return tokenId.toString();
    } catch (error) {
      console.error('Error creating NFT collection:', error);
      throw error;
    }
  }

  async mintNFT(
    tokenId: string,
    metadataUrl: string,
    supplyKey: PrivateKey
  ): Promise<TokenCreationResult> {
    try {
      // Following Hedera best practices: use IPFS URL as metadata
      // The metadata should be a URL pointing to the JSON metadata file on IPFS
      const metadataBytes = new TextEncoder().encode(metadataUrl);

      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([metadataBytes])
        .setMaxTransactionFee(new Hbar(20))
        .freezeWith(this.client);

      // Sign with the supply key (required for minting)
      const mintTxSign = await mintTx.sign(supplyKey);
      const mintTxSubmit = await mintTxSign.execute(this.client);
      const mintRx = await mintTxSubmit.getReceipt(this.client);

      const serialNumbers = mintRx.serials;
      if (!serialNumbers || serialNumbers.length === 0) {
        throw new Error('Failed to mint NFT');
      }

      return {
        tokenId,
        transactionId: mintTxSubmit.transactionId.toString(),
        serialNumber: serialNumbers[0].toNumber()
      };
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  async associateToken(tokenId: string, accountId: string, privateKey: string): Promise<void> {
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(this.client);

      const associateTxSign = await associateTx.sign(PrivateKey.fromString(privateKey));
      const associateTxSubmit = await associateTxSign.execute(this.client);
      await associateTxSubmit.getReceipt(this.client);
    } catch (error) {
      console.error('Error associating token:', error);
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

  // Helper method to ensure token association before minting
  async ensureTokenAssociation(tokenId: string, accountId: string, privateKey: string): Promise<void> {
    try {
      const isAssociated = await this.isTokenAssociated(tokenId, accountId);

      if (!isAssociated) {
        console.log(`Associating token ${tokenId} with account ${accountId}...`);
        await this.associateToken(tokenId, accountId, privateKey);
        console.log(`Token association completed successfully.`);
      } else {
        console.log(`Token ${tokenId} is already associated with account ${accountId}.`);
      }
    } catch (error) {
      console.error('Error ensuring token association:', error);
      throw error;
    }
  }

  async transferNFT(
    tokenId: string,
    serialNumber: number,
    fromAccountId: string,
    toAccountId: string,
    fromPrivateKey: string
  ): Promise<string> {
    try {
      const transferTx = new TransferTransaction()
        .addNftTransfer(tokenId, serialNumber, fromAccountId, toAccountId)
        .setMaxTransactionFee(new Hbar(10))
        .freezeWith(this.client);

      const transferTxSign = await transferTx.sign(PrivateKey.fromString(fromPrivateKey));
      const transferTxSubmit = await transferTxSign.execute(this.client);
      const transferRx = await transferTxSubmit.getReceipt(this.client);

      return transferTxSubmit.transactionId.toString();
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenId: string) {
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

  async getNFTInfo(tokenId: string, serialNumber: number) {
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

  async getAccountBalance(accountId: string) {
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

  public async getContractInfo(contractId: string) {
    try {
      const contractInfo = await new ContractInfoQuery()
        .setContractId(contractId)
        .execute(this.client);

      return {
        contractId: contractInfo.contractId.toString(),
        accountId: contractInfo.accountId?.toString(),
        adminKey: contractInfo.adminKey, // Return as Key object
        // Note: evmAddress and memo are not directly available on ContractInfo in Hedera SDK v2
        // You might need to query the mirror node for these details if required.
      };
    } catch (error) {
      console.error('Error getting contract info:', error);
      throw error;
    }
  }
}

export const hederaService = new HederaService();