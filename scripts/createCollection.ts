import { HederaService } from '../src/services/hederaService';
import { PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function createCollection() {
  try {
    const hederaService = new HederaService();

    // Collection configuration following Hedera best practices
    const collectionName = "Hgallery NFT Collection";
    const collectionSymbol = "HGLRY";
    const treasuryAccountId = process.env.HEDERA_OPERATOR_ID; // Treasury account
    const maxSupply = 10000; // Set a reasonable max supply for the collection

    if (!treasuryAccountId) {
      throw new Error("HEDERA_OPERATOR_ID is not set in .env file.");
    }

    console.log(`Creating NFT collection "${collectionName}" with symbol "${collectionSymbol}"...`);
    console.log(`Treasury Account: ${treasuryAccountId}`);
    console.log(`Max Supply: ${maxSupply}`);

    // Generate a dedicated supply key for this collection
    // This key will be used to mint NFTs and should be stored securely
    const supplyKey = PrivateKey.generateECDSA();
    console.log(`Generated Supply Key: ${supplyKey.toStringDer()}`);
    console.log(`Supply Key Public: ${supplyKey.publicKey.toStringDer()}`);

    const tokenId = await hederaService.createNFTCollection(
      collectionName,
      collectionSymbol,
      treasuryAccountId,
      supplyKey.publicKey, // Use the generated supply key's public key
      maxSupply // Pass max supply to the service
    );

    console.log(`\n✅ NFT Collection created successfully!`);
    console.log(`Token ID: ${tokenId}`);
    console.log(`\n📝 Please add these to your .env file:`);
    console.log(`NFT_COLLECTION_ID=${tokenId}`);
    console.log(`NFT_SUPPLY_KEY=${supplyKey.toStringDer()}`);
    console.log(`\n⚠️  IMPORTANT: Store the supply key securely! It's needed to mint NFTs.`);
  } catch (error) {
    console.error('Failed to create NFT collection:', error);
  }
}

createCollection();