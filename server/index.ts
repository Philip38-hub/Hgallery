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
 * Get NFT information with metadata
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

    // If the NFT has an IPFS metadata URL, fetch the metadata content
    if (nftInfo.metadata?.metadataUrl && nftInfo.metadata.metadataUrl.startsWith('ipfs://')) {
      try {
        const hash = nftInfo.metadata.metadataUrl.replace('ipfs://', '');
        console.log(`🔍 Fetching metadata for NFT #${serialNumber} from IPFS: ${hash}`);

        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
        if (response.ok) {
          const metadataContent = await response.json();
          console.log(`✅ Successfully fetched metadata for NFT #${serialNumber}`);

          // Add the metadata content to the response
          nftInfo.metadataContent = metadataContent;
        } else {
          console.warn(`⚠️ Failed to fetch metadata for NFT #${serialNumber}: ${response.statusText}`);
        }
      } catch (metadataError) {
        console.warn(`⚠️ Error fetching metadata for NFT #${serialNumber}:`, metadataError);
      }
    }

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
 * Get all NFTs from the collection
 * GET /api/collection/nfts
 */
app.get('/api/collection/nfts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📋 Fetching collection NFTs (limit: ${limit}, offset: ${offset})`);

    // Get token info to find total supply
    const tokenInfo = await hederaService.getTokenInfo(tokenId);
    const totalSupply = parseInt(tokenInfo.totalSupply);

    console.log(`📊 Total supply: ${totalSupply}`);

    if (totalSupply === 0) {
      return res.json({
        success: true,
        data: {
          nfts: [],
          totalSupply: 0,
          hasMore: false
        }
      });
    }

    const nfts = [];
    const startSerial = offset + 1;
    const endSerial = Math.min(startSerial + limit - 1, totalSupply);

    console.log(`🔍 Checking NFTs from serial ${startSerial} to ${endSerial}`);

    // Helper function to fetch metadata with retry logic
    const fetchMetadataWithRetry = async (hash: string, retries = 3, delay = 1000): Promise<any | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
          if (response.ok) {
            return await response.json();
          } else if (response.status === 429) {
            // Rate limited, wait longer before retry
            console.warn(`⚠️ Rate limited on attempt ${attempt}/${retries}, waiting ${delay * attempt}ms...`);
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, delay * attempt));
              continue;
            }
          } else {
            console.warn(`⚠️ HTTP ${response.status}: ${response.statusText}`);
            return null;
          }
        } catch (error) {
          console.warn(`⚠️ Attempt ${attempt}/${retries} failed:`, error);
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      return null;
    };

    // Fetch NFTs in the specified range
    for (let serial = startSerial; serial <= endSerial; serial++) {
      try {
        const nftInfo = await hederaService.getNFTInfo(tokenId, serial);

        // If the NFT has an IPFS metadata URL, fetch the metadata content
        if (nftInfo.metadata?.metadataUrl && nftInfo.metadata.metadataUrl.startsWith('ipfs://')) {
          const hash = nftInfo.metadata.metadataUrl.replace('ipfs://', '');
          console.log(`🔍 Fetching metadata for NFT #${serial} from IPFS: ${hash}`);

          const metadataContent = await fetchMetadataWithRetry(hash);
          if (metadataContent) {
            console.log(`✅ Successfully fetched metadata for NFT #${serial}`);
            nftInfo.metadataContent = metadataContent;
          } else {
            console.warn(`⚠️ Failed to fetch metadata for NFT #${serial} after retries`);
            // Create a fallback metadata object
            nftInfo.metadataContent = {
              name: `NFT #${serial}`,
              description: `Hedera NFT #${serial} from collection ${tokenId}`,
              image: `ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`, // Placeholder
              type: "image/jpg",
              creator: nftInfo.accountId
            };
          }

          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        nfts.push(nftInfo);
        console.log(`✅ Found NFT #${serial} owned by ${nftInfo.accountId}`);
      } catch (error) {
        console.debug(`⚠️ NFT #${serial} not found or not accessible:`, error);
        // Continue to next serial number
      }
    }

    const hasMore = endSerial < totalSupply;

    console.log(`📦 Returning ${nfts.length} NFTs, hasMore: ${hasMore}`);

    res.json({
      success: true,
      data: {
        nfts,
        totalSupply,
        hasMore,
        offset,
        limit
      }
    });

  } catch (error) {
    console.error('Error getting collection NFTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collection NFTs'
    });
  }
});

/**
 * Test IPFS metadata fetching
 * GET /api/test-ipfs?hash=<hash>
 */
app.get('/api/test-ipfs', async (req, res) => {
  try {
    const hash = req.query.hash as string;
    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Hash parameter is required'
      });
    }

    console.log(`🧪 Testing IPFS fetch for hash: ${hash}`);

    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched IPFS data:`, data);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error testing IPFS fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch from IPFS'
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
