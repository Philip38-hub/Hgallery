import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

interface TokenInfoRequest {
  tokenId: string;
  includeNFTs?: boolean;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔍 Handling OPTIONS preflight request');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    console.log(`🔍 Request method: ${req.method}`);
    console.log(`🔍 Request headers:`, Object.fromEntries(req.headers.entries()));

    // Parse request body
    const requestBody = await req.text();
    console.log(`🔍 Request body:`, requestBody);

    let parsedBody: TokenInfoRequest;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const {
      tokenId,
      includeNFTs = false,
      limit = 50,
      offset = 0
    } = parsedBody;

    if (!tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tokenId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Fetching token info for: ${tokenId} via Mirror Node API`);

    // Use Hedera Mirror Node REST API (more reliable than SDK in Edge Functions)
    const network = Deno.env.get('HEDERA_NETWORK') || 'testnet';
    const mirrorNodeUrl = network === 'mainnet' 
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    // Get token info
    const tokenResponse = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}`);
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token info: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data from Mirror Node:', tokenData);

    const responseData = {
      tokenId: tokenData.token_id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      totalSupply: tokenData.total_supply,
      treasuryAccountId: tokenData.treasury_account_id,
      tokenType: tokenData.type,
      createdTimestamp: tokenData.created_timestamp,
      modifiedTimestamp: tokenData.modified_timestamp,
    };

    // If includeNFTs is true and it's an NFT collection, fetch NFTs
    if (includeNFTs && tokenData.type === 'NON_FUNGIBLE_UNIQUE') {
      try {
        console.log(`🔍 Fetching NFTs for token ${tokenId}...`);
        
        // Get NFTs from Mirror Node API
        const nftResponse = await fetch(
          `${mirrorNodeUrl}/api/v1/tokens/${tokenId}/nfts?limit=${limit}&order=asc`
        );

        if (nftResponse.ok) {
          const nftData = await nftResponse.json();
          console.log(`📦 Found ${nftData.nfts?.length || 0} NFTs from Mirror Node`);

          const nfts = (nftData.nfts || []).map((nft: any) => ({
            tokenId: nft.token_id,
            serialNumber: parseInt(nft.serial_number),
            accountId: nft.account_id,
            createdAt: new Date(parseFloat(nft.created_timestamp) * 1000).toISOString(),
            metadata: {
              metadataUrl: nft.metadata ? new TextDecoder().decode(
                new Uint8Array(atob(nft.metadata).split('').map(c => c.charCodeAt(0)))
              ) : '',
              rawMetadata: nft.metadata ? Array.from(
                new Uint8Array(atob(nft.metadata).split('').map(c => c.charCodeAt(0)))
              ) : []
            },
            spender: nft.spender,
            delegating_spender: nft.delegating_spender
          }));

          responseData.nfts = nfts;
          responseData.hasMore = nftData.links?.next ? true : false;
          responseData.offset = offset;
          responseData.limit = limit;

          console.log(`✅ Successfully processed ${nfts.length} NFTs`);
        } else {
          console.warn(`Failed to fetch NFTs: ${nftResponse.status} ${nftResponse.statusText}`);
          responseData.nfts = [];
        }
      } catch (nftError) {
        console.error('Error fetching NFTs:', nftError);
        responseData.nfts = [];
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching token info via Mirror Node:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch token information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
