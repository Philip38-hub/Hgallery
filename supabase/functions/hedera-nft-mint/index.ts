import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Hedera SDK
import {
  Client,
  PrivateKey,
  TokenMintTransaction,
  TokenNftInfoQuery,
  TransferTransaction,
  TokenId,
  AccountId,
  Hbar
} from "https://esm.sh/@hashgraph/sdk@2.68.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MintRequest {
  metadataUrl: string;
  userAccountId?: string;
}

interface MintResponse {
  success: boolean;
  data?: {
    transactionId: string;
    serialNumber: number;
    tokenId: string;
    metadataUrl: string;
    owner: string;
    transferred: boolean;
    transferTransactionId?: string;
  };
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
    const nftCollectionId = Deno.env.get('NFT_COLLECTION_ID');
    const nftSupplyKey = Deno.env.get('NFT_SUPPLY_KEY');

    if (!hederaOperatorId || !hederaOperatorKey || !nftCollectionId || !nftSupplyKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    const { metadataUrl, userAccountId }: MintRequest = await req.json();

    if (!metadataUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'metadataUrl is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!metadataUrl.startsWith('ipfs://')) {
      return new Response(
        JSON.stringify({ success: false, error: 'metadataUrl must be an IPFS URL' }),
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

    console.log(`🔨 Minting NFT with metadata: ${metadataUrl}`);

    // Convert metadata URL to bytes
    const metadataBytes = new TextEncoder().encode(metadataUrl);

    // Mint the NFT
    const mintTransaction = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(nftCollectionId))
      .setMetadata([metadataBytes])
      .freezeWith(client);

    const mintSigned = await mintTransaction.sign(PrivateKey.fromStringDer(nftSupplyKey));
    const mintResponse = await mintSigned.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);

    if (mintReceipt.status.toString() !== 'SUCCESS') {
      throw new Error(`Mint transaction failed: ${mintReceipt.status.toString()}`);
    }

    const serialNumber = mintReceipt.serials[0].toNumber();
    console.log(`✅ NFT minted successfully! Serial: ${serialNumber}`);

    // Prepare response data
    const responseData: MintResponse['data'] = {
      transactionId: mintResponse.transactionId.toString(),
      serialNumber,
      tokenId: nftCollectionId,
      metadataUrl,
      owner: hederaOperatorId,
      transferred: false,
    };

    // If userAccountId is provided, transfer the NFT to the user
    if (userAccountId && userAccountId !== hederaOperatorId) {
      try {
        console.log(`📤 Transferring NFT to user: ${userAccountId}`);

        const transferTransaction = new TransferTransaction()
          .addNftTransfer(
            TokenId.fromString(nftCollectionId),
            serialNumber,
            AccountId.fromString(hederaOperatorId),
            AccountId.fromString(userAccountId)
          )
          .freezeWith(client);

        const transferSigned = await transferTransaction.sign(PrivateKey.fromStringDer(hederaOperatorKey));
        const transferResponse = await transferSigned.execute(client);
        const transferReceipt = await transferResponse.getReceipt(client);

        if (transferReceipt.status.toString() === 'SUCCESS') {
          responseData.owner = userAccountId;
          responseData.transferred = true;
          responseData.transferTransactionId = transferResponse.transactionId.toString();
          console.log(`✅ NFT transferred successfully!`);
        } else {
          console.warn(`⚠️ NFT minted but transfer failed: ${transferReceipt.status.toString()}`);
        }
      } catch (transferError) {
        console.warn(`⚠️ NFT minted but transfer failed:`, transferError);
        // Don't fail the entire request if transfer fails
      }
    }

    // Store in Supabase if available
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Store NFT record
        const { error: nftError } = await supabase
          .from('nfts')
          .insert([{
            token_id: nftCollectionId,
            serial_number: serialNumber,
            account_id: responseData.owner,
            metadata_url: metadataUrl,
          }]);

        if (nftError) {
          console.warn('Failed to store NFT in database:', nftError);
        } else {
          console.log('✅ NFT record stored in database');
        }
      }
    } catch (dbError) {
      console.warn('Database operation failed:', dbError);
      // Don't fail the request if database storage fails
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error minting NFT:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to mint NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
