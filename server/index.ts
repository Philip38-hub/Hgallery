import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HederaService } from '../src/services/hederaService';
import { PrivateKey } from '@hashgraph/sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Hedera service
const hederaService = new HederaService();

// Validate environment variables
const requiredEnvVars = [
  'NFT_COLLECTION_ID',
  'NFT_SUPPLY_KEY',
  'HEDERA_OPERATOR_ID',
  'HEDERA_OPERATOR_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const tokenId = process.env.NFT_COLLECTION_ID!;
const supplyKey = PrivateKey.fromStringDer(process.env.NFT_SUPPLY_KEY!);
const treasuryAccountId = process.env.HEDERA_OPERATOR_ID!;

// API Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    tokenId: tokenId,
    treasuryAccount: treasuryAccountId
  });
});

/**
 * Get token information
 */
app.get('/api/token-info', async (req, res) => {
  try {
    const tokenInfo = await hederaService.getTokenInfo(tokenId);
    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token information'
    });
  }
});

/**
 * Mint NFT endpoint
 * POST /api/mint-nft
 * Body: { metadataUrl: string, userAccountId?: string }
 */
app.post('/api/mint-nft', async (req, res) => {
  try {
    const { metadataUrl, userAccountId } = req.body;

    // Validate input
    if (!metadataUrl) {
      return res.status(400).json({
        success: false,
        error: 'metadataUrl is required'
      });
    }

    if (!metadataUrl.startsWith('ipfs://')) {
      return res.status(400).json({
        success: false,
        error: 'metadataUrl must be an IPFS URL'
      });
    }

    console.log(`🔨 Minting NFT with metadata: ${metadataUrl}`);
    
    // Mint the NFT to treasury first
    const mintResult = await hederaService.mintNFT(
      tokenId,
      metadataUrl,
      supplyKey
    );

    console.log(`✅ NFT minted successfully! Serial: ${mintResult.serialNumber}`);

    // If userAccountId is provided, transfer the NFT to the user
    let transferResult = null;
    if (userAccountId && userAccountId !== treasuryAccountId) {
      try {
        console.log(`📤 Transferring NFT to user: ${userAccountId}`);
        
        const transferTransactionId = await hederaService.transferNFT(
          tokenId,
          mintResult.serialNumber,
          treasuryAccountId,
          userAccountId,
          process.env.HEDERA_OPERATOR_KEY!
        );

        transferResult = { transactionId: transferTransactionId };

        console.log(`✅ NFT transferred successfully!`);
      } catch (transferError) {
        console.warn(`⚠️ NFT minted but transfer failed:`, transferError);
        // Don't fail the entire request if transfer fails
        // The NFT is still minted and can be transferred later
      }
    }

    res.json({
      success: true,
      data: {
        transactionId: mintResult.transactionId,
        serialNumber: mintResult.serialNumber,
        tokenId: tokenId,
        metadataUrl: metadataUrl,
        owner: transferResult ? userAccountId : treasuryAccountId,
        transferred: !!transferResult,
        transferTransactionId: transferResult?.transactionId || null
      }
    });

  } catch (error) {
    console.error('Error minting NFT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mint NFT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Transfer NFT endpoint
 * POST /api/transfer-nft
 * Body: { serialNumber: number, toAccountId: string }
 */
app.post('/api/transfer-nft', async (req, res) => {
  try {
    const { serialNumber, toAccountId } = req.body;

    // Validate input
    if (!serialNumber || !toAccountId) {
      return res.status(400).json({
        success: false,
        error: 'serialNumber and toAccountId are required'
      });
    }

    console.log(`📤 Transferring NFT ${tokenId}:${serialNumber} to ${toAccountId}`);

    const transferTransactionId = await hederaService.transferNFT(
      tokenId,
      serialNumber,
      treasuryAccountId,
      toAccountId,
      process.env.HEDERA_OPERATOR_KEY!
    );

    console.log(`✅ NFT transferred successfully!`);

    res.json({
      success: true,
      data: {
        transactionId: transferTransactionId,
        tokenId: tokenId,
        serialNumber: serialNumber,
        from: treasuryAccountId,
        to: toAccountId
      }
    });

  } catch (error) {
    console.error('Error transferring NFT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer NFT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get NFT information
 * GET /api/nft/:serialNumber
 */
app.get('/api/nft/:serialNumber', async (req, res) => {
  try {
    const serialNumber = parseInt(req.params.serialNumber);
    
    if (isNaN(serialNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid serial number'
      });
    }

    const nftInfo = await hederaService.getNFTInfo(tokenId, serialNumber);
    
    res.json({
      success: true,
      data: nftInfo
    });

  } catch (error) {
    console.error('Error getting NFT info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFT information'
    });
  }
});

/**
 * Get account balance
 * GET /api/balance/:accountId
 */
app.get('/api/balance/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const balance = await hederaService.getAccountBalance(accountId);
    
    res.json({
      success: true,
      data: balance
    });

  } catch (error) {
    console.error('Error getting account balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account balance'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Hgallery Backend API running on port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/api/health`);
  console.log(`🎨 Token ID: ${tokenId}`);
  console.log(`🏦 Treasury Account: ${treasuryAccountId}`);
});

export default app;
