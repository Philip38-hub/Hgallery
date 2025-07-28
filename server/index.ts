import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HederaService } from '../src/services/hederaService';
import { PrivateKey } from '@hashgraph/sdk';
import { cacheService } from './cacheService';

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
  const cacheStats = cacheService.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tokenId: tokenId,
    treasuryAccount: treasuryAccountId,
    cache: {
      totalKeys: cacheStats.keys,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
      memoryUsage: `${Math.round(cacheStats.vsize / 1024 / 1024 * 100) / 100} MB`
    }
  });
});

/**
 * Cache management endpoints
 */
app.get('/api/cache/stats', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    data: {
      ...stats,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      memoryUsage: `${Math.round(stats.vsize / 1024 / 1024 * 100) / 100} MB`
    }
  });
});

app.post('/api/cache/clear', (req, res) => {
  cacheService.invalidateAll();
  res.json({
    success: true,
    message: 'All caches cleared'
  });
});

app.post('/api/cache/preload', async (req, res) => {
  try {
    console.log('🔄 Starting cache preload...');

    // Get token info to find total supply
    const tokenInfo = await hederaService.getTokenInfo(tokenId);
    const totalSupply = parseInt(tokenInfo.totalSupply);

    if (totalSupply === 0) {
      return res.json({
        success: true,
        message: 'No NFTs to preload'
      });
    }

    // Helper functions for preloading
    const fetchNFT = async (serial: number) => {
      return await hederaService.getNFTInfo(tokenId, serial);
    };

    const fetchMetadata = async (hash: string) => {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    };

    // Start preloading in background
    cacheService.preloadCollection(tokenId, totalSupply, fetchNFT, fetchMetadata)
      .then(() => {
        console.log('✅ Cache preload completed');
      })
      .catch((error) => {
        console.error('❌ Cache preload failed:', error);
      });

    res.json({
      success: true,
      message: `Started preloading ${totalSupply} NFTs in background`
    });

  } catch (error) {
    console.error('Error starting cache preload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start cache preload'
    });
  }
});

/**
 * Get token information
 */
app.get('/api/token-info', async (req, res) => {
  try {
    // Check cache first
    let tokenInfo = cacheService.getTokenInfo(tokenId);

    if (!tokenInfo) {
      // Fetch from Hedera if not cached
      tokenInfo = await hederaService.getTokenInfo(tokenId);
      cacheService.setTokenInfo(tokenId, tokenInfo);
    }

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

    // Invalidate collection cache since we have a new NFT
    cacheService.invalidateCollection(tokenId);

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

    // Check cache first
    let nftInfo = cacheService.getNFT(tokenId, serialNumber);

    if (!nftInfo) {
      // Fetch from Hedera if not cached
      nftInfo = await hederaService.getNFTInfo(tokenId, serialNumber);

      // If the NFT has an IPFS metadata URL, fetch the metadata content
      if (nftInfo.metadata?.metadataUrl && nftInfo.metadata.metadataUrl.startsWith('ipfs://')) {
        const hash = nftInfo.metadata.metadataUrl.replace('ipfs://', '');
        console.log(`🔍 Fetching metadata for NFT #${serialNumber} from IPFS: ${hash}`);

        // Check metadata cache first
        let metadataContent = cacheService.getMetadata(hash);

        if (!metadataContent) {
          try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
            if (response.ok) {
              metadataContent = await response.json();
              cacheService.setMetadata(hash, metadataContent);
              console.log(`✅ Successfully fetched metadata for NFT #${serialNumber}`);
            } else {
              console.warn(`⚠️ Failed to fetch metadata for NFT #${serialNumber}: ${response.statusText}`);
            }
          } catch (metadataError) {
            console.warn(`⚠️ Error fetching metadata for NFT #${serialNumber}:`, metadataError);
          }
        }

        if (metadataContent) {
          nftInfo.metadataContent = metadataContent;
        }
      }

      // Cache the complete NFT data
      cacheService.setNFT({
        tokenId: nftInfo.tokenId,
        serialNumber: nftInfo.serialNumber,
        accountId: nftInfo.accountId,
        metadata: nftInfo.metadata,
        metadataContent: nftInfo.metadataContent,
        createdAt: nftInfo.createdAt,
        cachedAt: Date.now()
      });
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

    // Check cache first
    let cachedResult = cacheService.getCollection(tokenId, limit, offset);
    if (cachedResult) {
      console.log(`📦 Returning cached collection data`);
      return res.json({
        success: true,
        data: cachedResult
      });
    }

    // Get token info to find total supply (with caching)
    let tokenInfo = cacheService.getTokenInfo(tokenId);
    if (!tokenInfo) {
      tokenInfo = await hederaService.getTokenInfo(tokenId);
      cacheService.setTokenInfo(tokenId, tokenInfo);
    }
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
        // Check cache first
        let nftInfo = cacheService.getNFT(tokenId, serial);

        if (!nftInfo) {
          // Fetch from Hedera if not cached
          nftInfo = await hederaService.getNFTInfo(tokenId, serial);

          // If the NFT has an IPFS metadata URL, fetch the metadata content
          if (nftInfo.metadata?.metadataUrl && nftInfo.metadata.metadataUrl.startsWith('ipfs://')) {
            const hash = nftInfo.metadata.metadataUrl.replace('ipfs://', '');
            console.log(`🔍 Fetching metadata for NFT #${serial} from IPFS: ${hash}`);

            // Check metadata cache first
            let metadataContent = cacheService.getMetadata(hash);

            if (!metadataContent) {
              metadataContent = await fetchMetadataWithRetry(hash);
              if (metadataContent) {
                cacheService.setMetadata(hash, metadataContent);
              }
            }

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

          // Cache the complete NFT data
          cacheService.setNFT({
            tokenId: nftInfo.tokenId,
            serialNumber: nftInfo.serialNumber,
            accountId: nftInfo.accountId,
            metadata: nftInfo.metadata,
            metadataContent: nftInfo.metadataContent,
            createdAt: nftInfo.createdAt,
            cachedAt: Date.now()
          });
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

    const result = {
      nfts,
      totalSupply,
      hasMore,
      offset,
      limit
    };

    // Cache the result
    cacheService.setCollection(tokenId, limit, offset, result);

    res.json({
      success: true,
      data: result
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
