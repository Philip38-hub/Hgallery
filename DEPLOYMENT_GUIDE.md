# Hgallery Deployment Guide

This guide covers deploying the Hedera NFT Gallery to Supabase (backend) and Netlify (frontend).

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- Supabase account
- Netlify account
- Hedera testnet/mainnet account with HBAR balance

## Part 1: Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `hgallery` or your preferred name
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

### 2. Get Supabase Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (for Edge Functions)

### 3. Set Up Database Schema

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL to create tables and policies

### 4. Deploy Edge Functions

1. Install Supabase CLI locally:
   ```bash
   npm install supabase --save-dev
   ```

2. Login to Supabase:
   ```bash
   npx supabase login
   ```

3. Link your project:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_ID
   ```

4. Set environment variables for Edge Functions:
   ```bash
   npx supabase secrets set HEDERA_NETWORK=testnet
   npx supabase secrets set HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
   npx supabase secrets set HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY
   npx supabase secrets set NFT_COLLECTION_ID=0.0.YOUR_TOKEN_ID
   npx supabase secrets set NFT_SUPPLY_KEY=YOUR_SUPPLY_PRIVATE_KEY
   ```

5. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy hedera-nft-mint --no-verify-jwt
   npx supabase functions deploy hedera-token-info --no-verify-jwt
   ```

## Part 2: Netlify Setup

### 1. Prepare Repository

1. Ensure your code is pushed to GitHub/GitLab/Bitbucket
2. Make sure `netlify.toml` is in your repository root

### 2. Create Netlify Site

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Choose your Git provider and repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

### 3. Set Environment Variables

In Netlify dashboard, go to Site settings → Environment variables and add:

```
# Hedera Configuration
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
VITE_HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# NFT Collection
VITE_NFT_COLLECTION_ID=0.0.YOUR_TOKEN_ID
VITE_NFT_SUPPLY_KEY=YOUR_SUPPLY_PRIVATE_KEY

# Pinata IPFS
VITE_PINATA_JWT=YOUR_PINATA_JWT_TOKEN
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# HashConnect
VITE_HASHCONNECT_APP_NAME=Hedera Gallery
VITE_HASHCONNECT_APP_DESCRIPTION=Decentralized Media NFT Gallery
VITE_HASHCONNECT_ICON_URL=https://your-domain.netlify.app/logo.png

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID

# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Fallback API (optional - for Express server backup)
VITE_API_BASE_URL=https://your-express-api.herokuapp.com
```

### 4. Deploy

1. Click "Deploy site" in Netlify
2. Wait for build to complete
3. Your site will be available at `https://your-site-name.netlify.app`

## Part 3: Custom Domain (Optional)

### 1. Add Custom Domain

1. In Netlify dashboard, go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions

### 2. Enable HTTPS

1. Netlify automatically provisions SSL certificates
2. Enable "Force HTTPS" in domain settings

## Part 4: Testing Deployment

### 1. Test Basic Functionality

1. Visit your deployed site
2. Check that the gallery loads
3. Test wallet connection (HashPack)
4. Verify NFT display works

### 2. Test NFT Minting

1. Connect your wallet
2. Try minting a test NFT
3. Verify transaction appears on Hedera network
4. Check that NFT appears in gallery

### 3. Monitor Logs

1. Check Netlify function logs for any errors
2. Monitor Supabase Edge Function logs
3. Use browser developer tools to check for client-side errors

## Part 5: Maintenance

### 1. Environment Updates

- Update environment variables as needed
- Rotate API keys regularly
- Monitor Hedera account balance

### 2. Database Maintenance

- Monitor Supabase usage
- Clean up old data if needed
- Review RLS policies

### 3. Performance Monitoring

- Monitor Netlify analytics
- Check Supabase performance metrics
- Optimize based on usage patterns

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Check for TypeScript errors

2. **Edge Function Errors**
   - Verify Hedera credentials are correct
   - Check network connectivity
   - Monitor function logs in Supabase

3. **Wallet Connection Issues**
   - Verify HashConnect configuration
   - Check WalletConnect project ID
   - Test with different wallets

4. **NFT Minting Failures**
   - Verify account has sufficient HBAR balance
   - Check token association status
   - Verify supply key permissions

### Getting Help

- Check Supabase documentation: https://supabase.com/docs
- Check Netlify documentation: https://docs.netlify.com
- Check Hedera documentation: https://docs.hedera.com
- Review application logs for specific error messages

## Security Considerations

1. **Environment Variables**
   - Never commit private keys to repository
   - Use different keys for development/production
   - Regularly rotate API keys

2. **Database Security**
   - Review RLS policies regularly
   - Monitor database access logs
   - Use least-privilege access

3. **Frontend Security**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Use HTTPS everywhere

## Performance Optimization

1. **Frontend**
   - Enable Netlify CDN
   - Optimize images and assets
   - Use lazy loading for NFT gallery

2. **Backend**
   - Monitor Edge Function performance
   - Implement caching where appropriate
   - Optimize database queries

3. **Hedera Integration**
   - Batch operations when possible
   - Monitor transaction costs
   - Implement retry logic for failed transactions
