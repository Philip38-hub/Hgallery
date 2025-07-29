import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Hedera SDK
import {
  Client,
  PrivateKey,
  TokenInfoQuery,
  TokenNftInfoQuery,
  TokenId,
  AccountId,
  NftId
} from "https://esm.sh/@hashgraph/sdk@2.68.0"

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

interface TokenInfoResponse {
  success: boolean;
  data?: any;
  error?: string;
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

    // Initialize Hedera client
    const client = hederaNetwork === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    client.setOperator(
      AccountId.fromString(hederaOperatorId),
      PrivateKey.fromStringDer(hederaOperatorKey)
    );

    let responseData: any = {};

    // If serialNumber is provided, get specific NFT info
    if (serialNumber !== undefined) {
      console.log(`🔍 Fetching NFT info for ${tokenId}:${serialNumber}`);

      const nftInfoQuery = new TokenNftInfoQuery()
        .setNftId(new NftId(TokenId.fromString(tokenId), serialNumber));

      const nftInfo = await nftInfoQuery.execute(client);
      
      // Convert metadata bytes to string if present
      let metadataUrl = '';
      if (nftInfo.metadata && nftInfo.metadata.length > 0) {
        metadataUrl = new TextDecoder().decode(nftInfo.metadata);
      }

      responseData = {
        tokenId: nftInfo.nftId.tokenId.toString(),
        serialNumber: nftInfo.nftId.serial.toNumber(),
        accountId: nftInfo.accountId.toString(),
        createdAt: nftInfo.creationTime.toDate().toISOString(),
        metadata: {
          metadataUrl,
          rawMetadata: Array.from(nftInfo.metadata)
        }
      };

      // Try to fetch metadata content from IPFS if it's an IPFS URL
      if (metadataUrl.startsWith('ipfs://')) {
        try {
          const hash = metadataUrl.replace('ipfs://', '');
          const metadataResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
          if (metadataResponse.ok) {
            const metadataContent = await metadataResponse.json();
            responseData.metadataContent = metadataContent;
          }
        } catch (metadataError) {
          console.warn('Failed to fetch metadata content:', metadataError);
        }
      }

    } else {
      // Get token info
      console.log(`🔍 Fetching token info for ${tokenId}`);

      const tokenInfoQuery = new TokenInfoQuery()
        .setTokenId(TokenId.fromString(tokenId));

      const tokenInfo = await tokenInfoQuery.execute(client);

      responseData = {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasuryAccountId: tokenInfo.treasuryAccountId.toString(),
        adminKey: tokenInfo.adminKey?.toString() || null,
        kycKey: tokenInfo.kycKey?.toString() || null,
        freezeKey: tokenInfo.freezeKey?.toString() || null,
        wipeKey: tokenInfo.wipeKey?.toString() || null,
        supplyKey: tokenInfo.supplyKey?.toString() || null,
        defaultFreezeStatus: tokenInfo.defaultFreezeStatus,
        defaultKycStatus: tokenInfo.defaultKycStatus,
        isDeleted: tokenInfo.isDeleted,
        autoRenewPeriod: tokenInfo.autoRenewPeriod?.seconds.toString() || null,
        autoRenewAccount: tokenInfo.autoRenewAccountId?.toString() || null,
        expirationTime: tokenInfo.expirationTime?.toDate().toISOString() || null,
        tokenMemo: tokenInfo.tokenMemo,
        tokenType: tokenInfo.tokenType.toString(),
        supplyType: tokenInfo.supplyType.toString(),
        maxSupply: tokenInfo.maxSupply?.toString() || null,
        customFees: tokenInfo.customFees.map(fee => ({
          feeCollectorAccountId: fee.feeCollectorAccountId?.toString(),
          allCollectorsAreExempt: fee.allCollectorsAreExempt
        }))
      };

      // If includeNFTs is true, fetch NFT collection
      if (includeNFTs && tokenInfo.tokenType.toString() === 'NON_FUNGIBLE_UNIQUE') {
        try {
          const totalSupply = parseInt(tokenInfo.totalSupply.toString());
          const nfts = [];
          const startSerial = offset + 1;
          const endSerial = Math.min(startSerial + limit - 1, totalSupply);

          for (let serial = startSerial; serial <= endSerial; serial++) {
            try {
              const nftInfoQuery = new TokenNftInfoQuery()
                .setNftId(new NftId(TokenId.fromString(tokenId), serial));

              const nftInfo = await nftInfoQuery.execute(client);
              
              let metadataUrl = '';
              if (nftInfo.metadata && nftInfo.metadata.length > 0) {
                metadataUrl = new TextDecoder().decode(nftInfo.metadata);
              }

              nfts.push({
                tokenId: nftInfo.nftId.tokenId.toString(),
                serialNumber: nftInfo.nftId.serial.toNumber(),
                accountId: nftInfo.accountId.toString(),
                createdAt: nftInfo.creationTime.toDate().toISOString(),
                metadata: {
                  metadataUrl,
                  rawMetadata: Array.from(nftInfo.metadata)
                }
              });
            } catch (nftError) {
              console.warn(`Failed to fetch NFT #${serial}:`, nftError);
            }
          }

          responseData.nfts = nfts;
          responseData.hasMore = endSerial < totalSupply;
          responseData.offset = offset;
          responseData.limit = limit;
        } catch (collectionError) {
          console.warn('Failed to fetch NFT collection:', collectionError);
        }
      }
    }

    // Try to enhance with Supabase data if available
    try {
      const supabaseUrl = Deno.env.get('PROJECT_URL');
      const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (serialNumber !== undefined) {
          // Get specific NFT from database
          const { data: nftData } = await supabase
            .from('nfts')
            .select('*')
            .eq('token_id', tokenId)
            .eq('serial_number', serialNumber)
            .single();

          if (nftData) {
            responseData.databaseRecord = nftData;
            if (nftData.metadata_content) {
              responseData.metadataContent = nftData.metadata_content;
            }
          }
        } else {
          // Get token from database
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('*')
            .eq('token_id', tokenId)
            .single();

          if (tokenData) {
            responseData.databaseRecord = tokenData;
          }

          // Get collection stats
          const { data: statsData } = await supabase
            .rpc('get_collection_stats', { p_token_id: tokenId });

          if (statsData && statsData.length > 0) {
            responseData.collectionStats = statsData[0];
          }
        }
      }
    } catch (dbError) {
      console.warn('Database operation failed:', dbError);
      // Don't fail the request if database operations fail
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
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
