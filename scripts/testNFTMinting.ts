import { HederaService } from '../src/services/hederaService';
import { PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function testNFTMinting() {
  try {
    const hederaService = new HederaService();

    // Configuration
    const tokenId = process.env.NFT_COLLECTION_ID;
    const supplyKeyString = process.env.NFT_SUPPLY_KEY;
    const treasuryAccountId = process.env.HEDERA_OPERATOR_ID;
    const treasuryKey = process.env.HEDERA_OPERATOR_KEY;

    if (!tokenId) {
      throw new Error('NFT_COLLECTION_ID not set in .env file. Please run create-collection first.');
    }

    if (!supplyKeyString) {
      throw new Error('NFT_SUPPLY_KEY not set in .env file. Please run create-collection first.');
    }

    if (!treasuryAccountId || !treasuryKey) {
      throw new Error('HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY not set in .env file.');
    }

    console.log('🧪 Testing NFT Minting Flow...');
    console.log(`Token ID: ${tokenId}`);
    console.log(`Treasury Account: ${treasuryAccountId}`);

    // Parse the supply key
    const supplyKey = PrivateKey.fromStringDer(supplyKeyString);
    console.log('✅ Supply key parsed successfully');

    // Test metadata URL (this would normally be uploaded to IPFS)
    const testMetadataUrl = 'ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json';

    // Mint a test NFT
    console.log('\n🔨 Minting test NFT...');
    const mintResult = await hederaService.mintNFT(
      tokenId,
      testMetadataUrl,
      supplyKey
    );

    console.log('✅ NFT minted successfully!');
    console.log(`Transaction ID: ${mintResult.transactionId}`);
    console.log(`Serial Number: ${mintResult.serialNumber}`);

    // Get token info
    console.log('\n📊 Getting token information...');
    const tokenInfo = await hederaService.getTokenInfo(tokenId);
    console.log('Token Info:', tokenInfo);

    // Get NFT info
    console.log('\n🔍 Getting NFT information...');
    const nftInfo = await hederaService.getNFTInfo(tokenId, mintResult.serialNumber);
    console.log('NFT Info:', nftInfo);

    // Check treasury balance
    console.log('\n💰 Checking treasury balance...');
    const treasuryBalance = await hederaService.getAccountBalance(treasuryAccountId);
    console.log('Treasury Balance:', treasuryBalance);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Check your NFT on HashScan: https://hashscan.io/testnet/token/' + tokenId);
    console.log('2. Your NFT should now be visible in the collection');
    console.log('3. The NFT is currently owned by the treasury account');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
}

testNFTMinting();
