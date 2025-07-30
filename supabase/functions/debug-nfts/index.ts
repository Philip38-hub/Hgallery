import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import Hedera SDK
import {
  Client,
  PrivateKey,
  AccountId,
  TokenInfoQuery,
  TokenNftInfoQuery,
} from "https://esm.sh/@hashgraph/sdk@2.68.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const hederaNetwork = Deno.env.get('HEDERA_NETWORK') || 'testnet';
    const hederaOperatorId = Deno.env.get('HEDERA_OPERATOR_ID');
    const hederaOperatorKey = Deno.env.get('HEDERA_OPERATOR_KEY');

    if (!hederaOperatorId || !hederaOperatorKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    const { tokenId } = await req.json();

    if (!tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tokenId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Hedera client
    const client = hederaNetwork === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    const privateKey = PrivateKey.fromStringECDSA(hederaOperatorKey);
    client.setOperator(
      AccountId.fromString(hederaOperatorId),
      privateKey
    );

    console.log(`🔍 Debugging NFTs for token: ${tokenId}`);

    // Get token info first
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(tokenId);
    const tokenInfo = await tokenInfoQuery.execute(client);

    console.log('Token info:', {
      tokenId: tokenInfo.tokenId.toString(),
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      totalSupply: tokenInfo.totalSupply.toString(),
      treasuryAccountId: tokenInfo.treasuryAccountId.toString(),
      tokenType: tokenInfo.tokenType.toString()
    });

    // Get NFT info for each serial number
    const nfts = [];
    const totalSupply = parseInt(tokenInfo.totalSupply.toString());
    
    console.log(`🔍 Checking ${totalSupply} NFTs...`);

    for (let serial = 1; serial <= Math.min(totalSupply, 20); serial++) {
      try {
        console.log(`Checking NFT serial ${serial}...`);
        
        const nftInfoQuery = new TokenNftInfoQuery()
          .setTokenId(tokenId)
          .setSerialNumber(serial);
        
        const nftInfo = await nftInfoQuery.execute(client);
        
        const nftData = {
          tokenId: tokenId,
          serialNumber: serial,
          accountId: nftInfo.accountId.toString(),
          createdAt: nftInfo.creationTime.toDate().toISOString(),
          metadata: {
            rawMetadata: Array.from(nftInfo.metadata),
            metadataUrl: new TextDecoder().decode(nftInfo.metadata),
          }
        };

        console.log(`NFT ${serial}:`, nftData);
        nfts.push(nftData);

      } catch (nftError) {
        console.log(`NFT ${serial} error:`, nftError.message);
        console.log(`NFT ${serial} full error:`, nftError);
      }
    }

    console.log(`✅ Found ${nfts.length} NFTs total`);

    const result = {
      tokenInfo: {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasuryAccountId: tokenInfo.treasuryAccountId.toString(),
        tokenType: tokenInfo.tokenType.toString()
      },
      nfts: nfts,
      debug: {
        totalSupplyChecked: Math.min(totalSupply, 20),
        actualTotalSupply: totalSupply,
        nftsFound: nfts.length
      }
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error debugging NFTs:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to debug NFTs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
