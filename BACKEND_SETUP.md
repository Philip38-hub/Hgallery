# Backend Setup Guide

This guide explains how to set up and run the Hgallery backend API for secure NFT minting.

## Overview

The backend API provides secure NFT minting functionality by keeping private keys server-side. It handles:

- Secure NFT minting with treasury account private keys
- Automatic NFT transfers to user accounts
- Token information queries
- Account balance checks
- NFT metadata retrieval

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```
   # Hedera Configuration
   HEDERA_NETWORK=testnet
   HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
   HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY_DER_FORMAT
   
   # NFT Collection (from create-collection script)
   NFT_COLLECTION_ID=0.0.YOUR_TOKEN_ID
   NFT_SUPPLY_KEY=YOUR_SUPPLY_KEY_DER_FORMAT
   
   # Backend Configuration
   PORT=3001
   ```

2. **Dependencies**: Install backend dependencies:
   ```bash
   npm install express cors @types/express @types/cors
   ```

## Setup Steps

### 1. Create NFT Collection (if not done)

```bash
npm run create-collection
```

This will output the `NFT_COLLECTION_ID` and `NFT_SUPPLY_KEY` that you need to add to your `.env` file.

### 2. Start the Backend Server

```bash
npm run server
```

Or for development with auto-restart:

```bash
npm run server:dev
```

The server will start on `http://localhost:3001` by default.

### 3. Verify Backend Status

Check the health endpoint:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "tokenId": "0.0.YOUR_TOKEN_ID",
  "treasuryAccount": "0.0.YOUR_ACCOUNT_ID"
}
```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status and configuration

### Token Information
- **GET** `/api/token-info`
- Returns NFT collection details

### Mint NFT
- **POST** `/api/mint-nft`
- Body: `{ "metadataUrl": "ipfs://...", "userAccountId": "0.0.123456" }`
- Mints NFT and optionally transfers to user

### Transfer NFT
- **POST** `/api/transfer-nft`
- Body: `{ "serialNumber": 1, "toAccountId": "0.0.123456" }`
- Transfers NFT from treasury to user account

### Get NFT Info
- **GET** `/api/nft/:serialNumber`
- Returns NFT metadata and ownership info

### Get Account Balance
- **GET** `/api/balance/:accountId`
- Returns account HBAR and token balances

## Frontend Integration

The frontend automatically connects to the backend API. Make sure:

1. Backend is running on port 3001
2. Frontend environment variable `VITE_API_BASE_URL` is set (optional, defaults to `http://localhost:3001`)

## Security Notes

- Private keys are kept server-side only
- The backend should be deployed securely in production
- Consider using environment-specific configurations
- Monitor API usage and implement rate limiting for production

## Troubleshooting

### Backend Won't Start
- Check that all required environment variables are set
- Verify Hedera credentials are valid
- Ensure port 3001 is not in use

### Minting Fails
- Verify NFT collection exists and supply key is correct
- Check that treasury account has sufficient HBAR balance
- Ensure user account is associated with the token

### Transfer Fails
- Verify user account is associated with the token
- Check that NFT exists and is owned by treasury
- Ensure sufficient HBAR for transaction fees

## Production Deployment

For production deployment:

1. Use environment-specific `.env` files
2. Implement proper logging and monitoring
3. Add rate limiting and authentication
4. Use HTTPS and secure headers
5. Consider using a process manager like PM2
6. Set up proper backup and recovery procedures

## Development

To modify the backend:

1. Edit `server/index.ts`
2. The server will auto-restart with `npm run server:dev`
3. Test endpoints using curl or Postman
4. Check logs for debugging information
