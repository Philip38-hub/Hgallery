import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenInfoRequest {
  tokenId: string;
  serialNumber?: number;
  includeNFTs?: boolean;
  limit?: number;
  offset?: number;
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

    console.log('Environment check:', {
      network: hederaNetwork,
      hasOperatorId: !!hederaOperatorId,
      hasOperatorKey: !!hederaOperatorKey,
    });

    if (!hederaOperatorId || !hederaOperatorKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables',
          details: {
            hasOperatorId: !!hederaOperatorId,
            hasOperatorKey: !!hederaOperatorKey,
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { 
      tokenId, 
      serialNumber, 
      includeNFTs = false, 
      limit = 50, 
      offset = 0 
    }: TokenInfoRequest = await req.json();

    if (!tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tokenId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Request for token: ${tokenId}`);

    // For now, return mock data to test the function
    const mockData = {
      tokenId: tokenId,
      name: "Hedera Gallery NFT Collection",
      symbol: "HGNFT",
      totalSupply: "5",
      treasuryAccountId: hederaOperatorId,
      tokenType: "NON_FUNGIBLE_UNIQUE",
      nfts: includeNFTs ? [
        {
          tokenId: tokenId,
          serialNumber: 1,
          accountId: hederaOperatorId,
          createdAt: "2024-01-01T00:00:00.000Z",
          metadata: {
            metadataUrl: "ipfs://QmYourTestHash1",
            rawMetadata: []
          }
        },
        {
          tokenId: tokenId,
          serialNumber: 2,
          accountId: hederaOperatorId,
          createdAt: "2024-01-01T01:00:00.000Z",
          metadata: {
            metadataUrl: "ipfs://QmYourTestHash2",
            rawMetadata: []
          }
        }
      ] : undefined
    };

    return new Response(
      JSON.stringify({ success: true, data: mockData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching token info:', error);
    
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
