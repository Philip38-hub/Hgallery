import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import Hedera SDK
import {
  Client,
  PrivateKey,
  AccountId,
  AccountInfoQuery,
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

    // Initialize Hedera client
    const client = hederaNetwork === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();

    const results = {
      accountId: hederaOperatorId,
      keyFormats: {} as any
    };

    // Test each key format by trying to query account info
    const formats = [
      { name: 'der', method: 'fromStringDer' },
      { name: 'ecdsa', method: 'fromStringECDSA' },
      { name: 'ed25519', method: 'fromStringED25519' }
    ];

    for (const format of formats) {
      try {
        console.log(`Testing ${format.name} format...`);
        
        // Parse private key with this format
        let privateKey: PrivateKey;
        if (format.method === 'fromStringDer') {
          privateKey = PrivateKey.fromStringDer(hederaOperatorKey);
        } else if (format.method === 'fromStringECDSA') {
          privateKey = PrivateKey.fromStringECDSA(hederaOperatorKey);
        } else {
          privateKey = PrivateKey.fromStringED25519(hederaOperatorKey);
        }

        // Set operator with this key
        client.setOperator(
          AccountId.fromString(hederaOperatorId),
          privateKey
        );

        // Try to query account info (this will fail if the key doesn't match)
        const accountInfoQuery = new AccountInfoQuery()
          .setAccountId(AccountId.fromString(hederaOperatorId));

        const accountInfo = await accountInfoQuery.execute(client);

        results.keyFormats[format.name] = {
          success: true,
          publicKey: privateKey.publicKey.toString(),
          accountKey: accountInfo.key?.toString() || 'No key found',
          keyMatches: accountInfo.key?.toString() === privateKey.publicKey.toString(),
          balance: accountInfo.balance.toString()
        };

        console.log(`✅ ${format.name} format works!`);

      } catch (error) {
        results.keyFormats[format.name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.log(`❌ ${format.name} format failed:`, error instanceof Error ? error.message : error);
      }
    }

    // Find the working format
    const workingFormat = Object.entries(results.keyFormats)
      .find(([_, result]: [string, any]) => result.success && result.keyMatches);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: results,
        correctFormat: workingFormat ? workingFormat[0] : null,
        recommendation: workingFormat ? 
          `Use PrivateKey.fromString${workingFormat[0].toUpperCase()}()` : 
          'No matching format found - check if the private key belongs to this account'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error testing account match:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to test account match',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
