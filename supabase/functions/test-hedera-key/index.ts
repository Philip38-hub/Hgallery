import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import Hedera SDK
import {
  PrivateKey,
  AccountId,
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
    const hederaOperatorId = Deno.env.get('HEDERA_OPERATOR_ID');
    const hederaOperatorKey = Deno.env.get('HEDERA_OPERATOR_KEY');

    if (!hederaOperatorId || !hederaOperatorKey) {
      throw new Error('Missing required environment variables');
    }

    const keyTests = {
      keyLength: hederaOperatorKey.length,
      keyStart: hederaOperatorKey.substring(0, 10) + '...',
      accountId: hederaOperatorId,
      tests: {} as any
    };

    // Test different key formats
    try {
      const derKey = PrivateKey.fromStringDer(hederaOperatorKey);
      keyTests.tests.der = {
        success: true,
        publicKey: derKey.publicKey.toString()
      };
    } catch (error) {
      keyTests.tests.der = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    try {
      const ecdsaKey = PrivateKey.fromStringECDSA(hederaOperatorKey);
      keyTests.tests.ecdsa = {
        success: true,
        publicKey: ecdsaKey.publicKey.toString()
      };
    } catch (error) {
      keyTests.tests.ecdsa = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    try {
      const ed25519Key = PrivateKey.fromStringED25519(hederaOperatorKey);
      keyTests.tests.ed25519 = {
        success: true,
        publicKey: ed25519Key.publicKey.toString()
      };
    } catch (error) {
      keyTests.tests.ed25519 = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Try to determine which format worked
    const workingFormats = Object.entries(keyTests.tests)
      .filter(([_, test]: [string, any]) => test.success)
      .map(([format, _]) => format);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: keyTests,
        workingFormats,
        recommendation: workingFormats.length > 0 ? 
          `Use PrivateKey.fromString${workingFormats[0].toUpperCase()}()` : 
          'No valid format found'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error testing key formats:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to test key formats',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
