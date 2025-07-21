import { HederaService } from '../src/services/hederaService';
import { PublicKey, ContractId, KeyList } from '@hashgraph/sdk'; // Import PublicKey, ContractId, and KeyList
import dotenv from 'dotenv';

dotenv.config();

async function createCollection() {
  try {
    const hederaService = new HederaService();

    // Replace with your desired collection name, symbol, and treasury account ID
    // The treasuryAccountId is the account that will own the NFT collection
    // and receive the initial supply of NFTs (which is 0 for unique NFTs).
    // It's typically the operator account or a dedicated treasury account.
    const collectionName = "Hgallery NFT Collection";
    const collectionSymbol = "HGLRY";
    const treasuryAccountId = process.env.HEDERA_OPERATOR_ID; // Using operator ID as treasury for simplicity
    const contractEvmAddress = process.env.NFT_CONTRACT_ID; // Assuming contract EVM address is available in .env

    if (!treasuryAccountId) {
      throw new Error("HEDERA_OPERATOR_ID is not set in .env file.");
    }

    if (!contractEvmAddress) {
      throw new Error("NFT_CONTRACT_ID (EVM address) is not set in .env file. Please deploy the contract first.");
    }

    console.log(`Creating NFT collection "${collectionName}" with symbol "${collectionSymbol}"...`);
    
    // Convert EVM address to Hedera ContractId
    // The contract's admin key is not directly used for token creation,
    // instead, the operator's public key will be used as the supply key for the NFT collection.
    // This simplifies the process and avoids issues with retrieving the contract's admin key.
    const contractId = ContractId.fromEvmAddress(0, 0, contractEvmAddress);
    // No need to get contract info for admin key, use operator's public key directly

    const tokenId = await hederaService.createNFTCollection(
      collectionName,
      collectionSymbol,
      treasuryAccountId,
      hederaService.getOperatorPublicKey() // Use the operator's public key as the supply key
    );

    console.log(`NFT Collection created successfully!`);
    console.log(`Token ID: ${tokenId}`);
    console.log(`Please add this Token ID to your .env file, e.g., NFT_COLLECTION_ID=${tokenId}`);
  } catch (error) {
    console.error('Failed to create NFT collection:', error);
  }
}

createCollection();