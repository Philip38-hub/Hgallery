#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DeploymentConfig {
  supabaseProjectId?: string;
  netlifyApiToken?: string;
  netlifySiteId?: string;
  hederaNetwork: 'testnet' | 'mainnet';
  hederaOperatorId: string;
  hederaOperatorKey: string;
  nftCollectionId: string;
  nftSupplyKey: string;
  pinataJwt: string;
  walletConnectProjectId: string;
}

function log(message: string) {
  console.log(`🔧 ${message}`);
}

function error(message: string) {
  console.error(`❌ ${message}`);
}

function success(message: string) {
  console.log(`✅ ${message}`);
}

function execCommand(command: string, description: string) {
  try {
    log(description);
    execSync(command, { stdio: 'inherit' });
    success(`${description} completed`);
  } catch (err) {
    error(`${description} failed: ${err}`);
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('Checking prerequisites...');
  
  // Check if .env file exists
  if (!existsSync('.env')) {
    error('.env file not found. Please copy .env.example to .env and fill in your values.');
    process.exit(1);
  }

  // Check if Supabase CLI is available
  try {
    execSync('npx supabase --version', { stdio: 'pipe' });
  } catch {
    error('Supabase CLI not found. Installing...');
    execCommand('npm install supabase --save-dev', 'Installing Supabase CLI');
  }

  success('Prerequisites check completed');
}

function loadEnvironmentConfig(): DeploymentConfig {
  log('Loading environment configuration...');
  
  const envContent = readFileSync('.env', 'utf-8');
  const envLines = envContent.split('\n');
  const envVars: Record<string, string> = {};

  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  }

  const config: DeploymentConfig = {
    hederaNetwork: (envVars.VITE_HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet',
    hederaOperatorId: envVars.VITE_HEDERA_OPERATOR_ID || '',
    hederaOperatorKey: envVars.VITE_HEDERA_OPERATOR_KEY || '',
    nftCollectionId: envVars.VITE_NFT_COLLECTION_ID || '',
    nftSupplyKey: envVars.VITE_NFT_SUPPLY_KEY || '',
    pinataJwt: envVars.VITE_PINATA_JWT || '',
    walletConnectProjectId: envVars.VITE_WALLETCONNECT_PROJECT_ID || '',
    supabaseProjectId: envVars.SUPABASE_PROJECT_ID,
    netlifyApiToken: envVars.NETLIFY_AUTH_TOKEN,
    netlifySiteId: envVars.NETLIFY_SITE_ID,
  };

  // Validate required fields
  const requiredFields = [
    'hederaOperatorId',
    'hederaOperatorKey',
    'nftCollectionId',
    'nftSupplyKey',
    'pinataJwt',
    'walletConnectProjectId'
  ];

  for (const field of requiredFields) {
    if (!config[field as keyof DeploymentConfig]) {
      error(`Missing required environment variable: ${field}`);
      process.exit(1);
    }
  }

  success('Environment configuration loaded');
  return config;
}

function setupSupabase(config: DeploymentConfig) {
  log('Setting up Supabase...');

  // Initialize Supabase if not already done
  if (!existsSync('supabase/config.toml')) {
    execCommand('npx supabase init', 'Initializing Supabase project');
  }

  // Start local Supabase (for development)
  try {
    execCommand('npx supabase start', 'Starting local Supabase');
  } catch {
    log('Local Supabase already running or failed to start');
  }

  // If project ID is provided, link to remote project
  if (config.supabaseProjectId) {
    execCommand(
      `npx supabase link --project-ref ${config.supabaseProjectId}`,
      'Linking to Supabase project'
    );

    // Set secrets for Edge Functions
    const secrets = [
      `HEDERA_NETWORK=${config.hederaNetwork}`,
      `HEDERA_OPERATOR_ID=${config.hederaOperatorId}`,
      `HEDERA_OPERATOR_KEY=${config.hederaOperatorKey}`,
      `NFT_COLLECTION_ID=${config.nftCollectionId}`,
      `NFT_SUPPLY_KEY=${config.nftSupplyKey}`,
    ];

    for (const secret of secrets) {
      try {
        execCommand(
          `npx supabase secrets set ${secret}`,
          `Setting secret: ${secret.split('=')[0]}`
        );
      } catch {
        log(`Failed to set secret: ${secret.split('=')[0]}`);
      }
    }

    // Deploy Edge Functions
    execCommand(
      'npx supabase functions deploy hedera-nft-mint --no-verify-jwt',
      'Deploying NFT mint function'
    );

    execCommand(
      'npx supabase functions deploy hedera-token-info --no-verify-jwt',
      'Deploying token info function'
    );
  }

  success('Supabase setup completed');
}

function setupNetlify(config: DeploymentConfig) {
  log('Setting up Netlify...');

  // Check if Netlify CLI is available
  try {
    execSync('netlify --version', { stdio: 'pipe' });
  } catch {
    log('Netlify CLI not found. Please install it globally: npm install -g netlify-cli');
    return;
  }

  // Build the project
  execCommand('npm run build', 'Building project for deployment');

  // Deploy to Netlify if tokens are provided
  if (config.netlifyApiToken && config.netlifySiteId) {
    execCommand(
      `NETLIFY_AUTH_TOKEN=${config.netlifyApiToken} NETLIFY_SITE_ID=${config.netlifySiteId} netlify deploy --prod --dir=dist`,
      'Deploying to Netlify'
    );
  } else {
    log('Netlify tokens not provided. Please deploy manually or set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID');
  }

  success('Netlify setup completed');
}

function generateDeploymentSummary(config: DeploymentConfig) {
  log('Generating deployment summary...');

  const summary = `
# Deployment Summary

## Configuration
- Hedera Network: ${config.hederaNetwork}
- NFT Collection ID: ${config.nftCollectionId}
- Supabase Project: ${config.supabaseProjectId || 'Not configured'}
- Netlify Site: ${config.netlifySiteId || 'Not configured'}

## Next Steps

### If deploying to production:
1. Set up your Supabase project at https://supabase.com
2. Set up your Netlify site at https://netlify.com
3. Configure environment variables in both platforms
4. Run deployment commands

### For local development:
1. Start the development server: \`npm run dev\`
2. Start the backend server: \`npm run server:dev\`
3. Access the app at http://localhost:5173

### Useful Commands:
- \`npm run supabase:start\` - Start local Supabase
- \`npm run deploy:supabase\` - Deploy Edge Functions
- \`npm run deploy:netlify\` - Deploy to Netlify
- \`npm run test-flow\` - Test complete NFT flow

## Documentation
- See DEPLOYMENT_GUIDE.md for detailed instructions
- Check .env.example for all required environment variables
`;

  writeFileSync('DEPLOYMENT_SUMMARY.md', summary);
  success('Deployment summary generated: DEPLOYMENT_SUMMARY.md');
}

async function main() {
  console.log('🚀 Hgallery Deployment Setup\n');

  try {
    checkPrerequisites();
    const config = loadEnvironmentConfig();
    
    // Setup services
    setupSupabase(config);
    setupNetlify(config);
    
    // Generate summary
    generateDeploymentSummary(config);

    success('Deployment setup completed successfully!');
    console.log('\n📖 Check DEPLOYMENT_SUMMARY.md for next steps');
    
  } catch (err) {
    error(`Setup failed: ${err}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
