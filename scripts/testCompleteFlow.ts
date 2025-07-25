import { HederaService } from '../src/services/hederaService';
import { backendService } from '../src/services/backendService';
import { PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCompleteFlow() {
  console.log('🚀 Testing Complete NFT Minting Flow...\n');

  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking Environment Configuration...');
    const requiredEnvVars = [
      'NFT_COLLECTION_ID',
      'NFT_SUPPLY_KEY',
      'HEDERA_OPERATOR_ID',
      'HEDERA_OPERATOR_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`❌ Missing required environment variable: ${envVar}`);
      }
    }

    const tokenId = process.env.NFT_COLLECTION_ID!;
    const treasuryAccountId = process.env.HEDERA_OPERATOR_ID!;
    
    console.log(`✅ Environment configured`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Treasury: ${treasuryAccountId}\n`);

    // 2. Test backend health
    console.log('2️⃣ Testing Backend Service...');
    try {
      const healthResponse = await axios.get('http://localhost:3001/api/health');
      console.log('✅ Backend service is online');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Token ID: ${healthResponse.data.tokenId}\n`);
    } catch (error) {
      throw new Error('❌ Backend service is not running. Please start it with: npm run server');
    }

    // 3. Test token info retrieval
    console.log('3️⃣ Testing Token Information Retrieval...');
    const tokenInfoResponse = await backendService.getTokenInfo();
    
    if (!tokenInfoResponse.success) {
      throw new Error(`❌ Failed to get token info: ${tokenInfoResponse.error}`);
    }

    const tokenInfo = tokenInfoResponse.data!;
    console.log('✅ Token information retrieved');
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);
    console.log(`   Total Supply: ${tokenInfo.totalSupply}\n`);

    // 4. Test NFT minting via backend API
    console.log('4️⃣ Testing NFT Minting via Backend API...');
    
    // Create test metadata URL (simulating IPFS upload)
    const testMetadataUrl = 'ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json';
    
    const mintResponse = await backendService.mintNFT({
      metadataUrl: testMetadataUrl,
      userAccountId: treasuryAccountId // Mint to treasury for testing
    });

    if (!mintResponse.success) {
      throw new Error(`❌ Failed to mint NFT: ${mintResponse.error}`);
    }

    const mintData = mintResponse.data!;
    console.log('✅ NFT minted successfully via backend API');
    console.log(`   Transaction ID: ${mintData.transactionId}`);
    console.log(`   Serial Number: ${mintData.serialNumber}`);
    console.log(`   Owner: ${mintData.owner}`);
    console.log(`   Transferred: ${mintData.transferred}\n`);

    // 5. Test NFT information retrieval
    console.log('5️⃣ Testing NFT Information Retrieval...');
    
    const nftInfoResponse = await backendService.getNFTInfo(mintData.serialNumber);
    
    if (!nftInfoResponse.success) {
      throw new Error(`❌ Failed to get NFT info: ${nftInfoResponse.error}`);
    }

    const nftInfo = nftInfoResponse.data!;
    console.log('✅ NFT information retrieved');
    console.log(`   Token ID: ${nftInfo.tokenId}`);
    console.log(`   Serial Number: ${nftInfo.serialNumber}`);
    console.log(`   Owner: ${nftInfo.accountId}`);
    console.log(`   Metadata: ${JSON.stringify(nftInfo.metadata, null, 2)}\n`);

    // 6. Test account balance
    console.log('6️⃣ Testing Account Balance Retrieval...');
    
    const balanceResponse = await backendService.getAccountBalance(treasuryAccountId);
    
    if (!balanceResponse.success) {
      throw new Error(`❌ Failed to get account balance: ${balanceResponse.error}`);
    }

    const balance = balanceResponse.data!;
    console.log('✅ Account balance retrieved');
    console.log(`   HBAR Balance: ${balance.hbars}`);
    console.log(`   Token Balances: ${JSON.stringify(balance.tokens, null, 2)}\n`);

    // 7. Test direct Hedera service (for comparison)
    console.log('7️⃣ Testing Direct Hedera Service...');
    
    const hederaService = new HederaService();
    const directTokenInfo = await hederaService.getTokenInfo(tokenId);
    
    console.log('✅ Direct Hedera service working');
    console.log(`   Token Name: ${directTokenInfo.name}`);
    console.log(`   Total Supply: ${directTokenInfo.totalSupply}\n`);

    // 8. Summary
    console.log('🎉 Complete Flow Test Summary:');
    console.log('✅ Environment configuration - OK');
    console.log('✅ Backend service health - OK');
    console.log('✅ Token information retrieval - OK');
    console.log('✅ NFT minting via API - OK');
    console.log('✅ NFT information retrieval - OK');
    console.log('✅ Account balance retrieval - OK');
    console.log('✅ Direct Hedera service - OK');
    
    console.log('\n🚀 Your Hgallery NFT minting system is fully operational!');
    console.log('\n📋 Next Steps for Demo:');
    console.log('1. Start the frontend: npm run dev');
    console.log('2. Start the backend: npm run server');
    console.log('3. Navigate to: http://localhost:8081/mint');
    console.log('4. Connect your HashPack wallet');
    console.log('5. Associate with the token collection');
    console.log('6. Upload and mint your first NFT!');
    
    console.log('\n🔗 Useful Links:');
    console.log(`- HashScan (Token): https://hashscan.io/testnet/token/${tokenId}`);
    console.log(`- HashScan (Account): https://hashscan.io/testnet/account/${treasuryAccountId}`);
    console.log(`- Backend Health: http://localhost:3001/api/health`);
    console.log(`- Frontend: http://localhost:8081`);

  } catch (error) {
    console.error('\n❌ Complete Flow Test Failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure all environment variables are set in .env');
    console.log('2. Run "npm run create-collection" if you haven\'t created a collection');
    console.log('3. Start the backend server: npm run server');
    console.log('4. Check that your Hedera account has sufficient HBAR balance');
    console.log('5. Verify your private keys are in DER format');
    
    process.exit(1);
  }
}

// Run the test
testCompleteFlow();
