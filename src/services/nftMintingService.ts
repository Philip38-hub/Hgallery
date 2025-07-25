import {
  TokenMintTransaction,
  TokenId,
  PrivateKey,
  TransferTransaction,
  AccountId,
  Hbar
} from '@hashgraph/sdk';
import { useWallet } from '@/contexts/WalletContext';
import { backendService } from './backendService';

export interface MintingResult {
  transactionId: string;
  serialNumber: number;
  tokenId: string;
}

/**
 * Proper Hedera NFT Minting Service following decentralized signing patterns
 * 
 * Architecture:
 * 1. Backend creates unsigned transactions
 * 2. Frontend sends to user's wallet for signing
 * 3. User approves and signs in HashPack
 * 4. Wallet submits signed transaction to Hedera
 */
export class NFTMintingService {
  
  /**
   * Method 1: Hybrid Approach (Current - for MVP demo)
   * Backend mints to treasury, then transfers to user with user signature
   */
  async mintAndTransferNFT(
    metadataUrl: string,
    userAccountId: string,
    walletService: { signTransaction: (tx: any) => Promise<any> }
  ): Promise<MintingResult> {
    try {
      // Step 1: Backend mints NFT to treasury (using treasury keys)
      console.log('🔨 Minting NFT to treasury...');
      const mintResponse = await backendService.mintNFT({
        metadataUrl,
        userAccountId: undefined // Don't auto-transfer
      });

      if (!mintResponse.success || !mintResponse.data) {
        throw new Error(mintResponse.error || 'Failed to mint NFT');
      }

      const { serialNumber, tokenId, transactionId } = mintResponse.data;
      console.log(`✅ NFT minted to treasury: Serial #${serialNumber}`);

      // Check if treasury and user are the same account
      if (mintResponse.data.owner === userAccountId) {
        console.log('🎯 Treasury and user are the same account - no transfer needed!');
        console.log(`✅ NFT #${serialNumber} is already owned by user: ${userAccountId}`);

        return {
          transactionId: transactionId,
          serialNumber,
          tokenId
        };
      }

      // Step 2: User signs transfer transaction to receive the NFT
      console.log('📝 Creating transfer transaction for user to sign...');
      console.log(`Transferring from ${mintResponse.data.owner} to ${userAccountId}`);

      // Create a fresh transfer transaction
      const transferTx = new TransferTransaction()
        .addNftTransfer(
          TokenId.fromString(tokenId),
          serialNumber,
          AccountId.fromString(mintResponse.data.owner), // Treasury
          AccountId.fromString(userAccountId) // User
        )
        .setMaxTransactionFee(new Hbar(2)); // Set reasonable fee limit

      console.log('Transfer transaction details:', {
        tokenId,
        serialNumber,
        from: mintResponse.data.owner,
        to: userAccountId,
        isFrozen: transferTx.isFrozen()
      });

      // Step 3: Send to wallet for user signature
      console.log('🔐 Sending transfer transaction to wallet for signing...');
      const transferTransactionId = await walletService.signTransaction(transferTx);

      console.log('✅ Transfer transaction signed:', transferTransactionId);
      
      console.log(`✅ NFT transferred to user: ${transferTransactionId}`);

      return {
        transactionId: transferTransactionId,
        serialNumber,
        tokenId
      };

    } catch (error) {
      console.error('Error in mint and transfer flow:', error);
      throw error;
    }
  }

  /**
   * Method 2: Fully Decentralized Approach (Future implementation)
   * User signs the actual minting transaction
   */
  async mintNFTWithUserSignature(
    metadataUrl: string,
    userAccountId: string,
    hashConnectService: any
  ): Promise<MintingResult> {
    try {
      // This would require:
      // 1. Backend to provide supply key or delegate minting authority
      // 2. User to have minting permissions
      // 3. More complex key management
      
      // For now, this is a placeholder for future implementation
      throw new Error('Fully decentralized minting not yet implemented');
      
      // Future implementation would look like:
      // const mintTx = new TokenMintTransaction()
      //   .setTokenId(tokenId)
      //   .setMetadata([new TextEncoder().encode(metadataUrl)])
      //   .setTransactionMemo(`Hgallery NFT mint`);
      // 
      // return await hashConnectService.signTransaction(mintTx);
      
    } catch (error) {
      console.error('Error in decentralized minting:', error);
      throw error;
    }
  }

  /**
   * Method 3: Backend-Only Approach (Current test implementation)
   * Used for testing and admin operations
   */
  async mintNFTBackendOnly(
    metadataUrl: string,
    userAccountId?: string
  ): Promise<MintingResult> {
    try {
      const mintResponse = await backendService.mintNFT({
        metadataUrl,
        userAccountId
      });

      if (!mintResponse.success || !mintResponse.data) {
        throw new Error(mintResponse.error || 'Failed to mint NFT');
      }

      return {
        transactionId: mintResponse.data.transactionId,
        serialNumber: mintResponse.data.serialNumber,
        tokenId: mintResponse.data.tokenId
      };

    } catch (error) {
      console.error('Error in backend-only minting:', error);
      throw error;
    }
  }
}

export const nftMintingService = new NFTMintingService();
