import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const projectUrl = Deno.env.get('PROJECT_URL');
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');

    const envCheck = {
      network: hederaNetwork,
      hasOperatorId: !!hederaOperatorId,
      hasOperatorKey: !!hederaOperatorKey,
      hasProjectUrl: !!projectUrl,
      hasServiceKey: !!serviceKey,
      operatorIdLength: hederaOperatorId?.length || 0,
      operatorKeyLength: hederaOperatorKey?.length || 0,
    };

    console.log('Environment check:', envCheck);

    // Parse request body
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No JSON body or invalid JSON');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function working!',
        environment: envCheck,
        requestBody,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in test function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Test function failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
