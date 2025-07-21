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
import dotenv from 'dotenv'; // Import dotenv
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { dirname } from 'path'; // Import dirname
import * as path from 'path'; // Import path

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load environment variables from root .env

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

  constructor() {
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorId || !operatorKey) {
      throw new Error('Hedera operator credentials not configured');
    }

    this.operatorId = AccountId.fromString(operatorId);
    this.operatorKey = PrivateKey.fromStringECDSA(operatorKey); // Assuming ECDSA key

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
    supplyKey?: PrivateKey | PublicKey // Changed to PublicKey
  ): Promise<string> {
    try {
      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Infinite)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyKey(supplyKey || this.operatorKey) // Use provided supplyKey or operatorKey
        .setAdminKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(this.client);

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
    metadata: NFTMetadata,
    accountId: string
  ): Promise<TokenCreationResult> {
    try {
      // Convert metadata to bytes
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));

      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([metadataBytes])
        .setMaxTransactionFee(new Hbar(20))
        .freezeWith(this.client);

      const mintTxSign = await mintTx.sign(this.operatorKey);
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
        .freezeWith(this.client);

      const associateTxSign = await associateTx.sign(PrivateKey.fromString(privateKey));
      const associateTxSubmit = await associateTxSign.execute(this.client);
      await associateTxSubmit.getReceipt(this.client);
    } catch (error) {
      console.error('Error associating token:', error);
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
      const metadata = JSON.parse(metadataString);

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