# Hedera NFT Setup Guide

This guide explains how to properly set up and use the Hedera NFT functionality in Hgallery, following Hedera best practices.

## Overview

The application now uses **Hedera Token Service (HTS)** for NFT creation and management, which is the recommended approach for NFTs on Hedera. This replaces the previous smart contract approach.

## Key Changes

1. **Native Hedera Token Service**: Uses `TokenCreateTransaction` and `TokenMintTransaction` instead of smart contracts
2. **Proper Metadata Format**: Metadata is stored as IPFS URLs following Hedera standards
3. **Token Association**: Accounts must be associated with tokens before receiving NFTs
4. **Supply Key Management**: Dedicated supply keys for minting control

## Setup Steps

### 1. Environment Configuration

Update your `.env` file with the following variables:

```env
# Hedera Network Configuration
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
VITE_HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# Server-side Hedera Configuration (for scripts)
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# NFT Collection Configuration (set after creating collection)
VITE_NFT_COLLECTION_ID=0.0.YOUR_TOKEN_ID
VITE_NFT_SUPPLY_KEY=YOUR_SUPPLY_PRIVATE_KEY
NFT_COLLECTION_ID=0.0.YOUR_TOKEN_ID
NFT_SUPPLY_KEY=YOUR_SUPPLY_PRIVATE_KEY

# Pinata IPFS Configuration
VITE_PINATA_JWT=YOUR_PINATA_JWT_TOKEN
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud
```

### 2. Create NFT Collection

Run the collection creation script:

```bash
npm run create-collection
```

This will:
- Create a new NFT collection using Hedera Token Service
- Generate a dedicated supply key for minting
- Set a finite supply limit (10,000 NFTs)
- Output the Token ID and Supply Key

**Important**: Save the output values to your `.env` file:
- `NFT_COLLECTION_ID` - The token ID of your collection
- `NFT_SUPPLY_KEY` - The private key needed for minting (keep secure!)

### 3. Test NFT Minting

Test the complete NFT flow:

```bash
npm run test-nft
```

This will:
- Mint a test NFT to your collection
- Verify the NFT was created successfully
- Display token and NFT information
- Show treasury account balance

### 4. Verify on HashScan

Check your collection on HashScan:
- Go to: `https://hashscan.io/testnet/token/YOUR_TOKEN_ID`
- You should see your collection with the minted NFTs

## NFT Flow Explanation

### 1. Token Creation
```typescript
// Creates an NFT collection with finite supply
const tokenCreateTx = new TokenCreateTransaction()
  .setTokenName("Hgallery NFT Collection")
  .setTokenSymbol("HGLRY")
  .setTokenType(TokenType.NonFungibleUnique)
  .setSupplyType(TokenSupplyType.Finite)
  .setMaxSupply(10000)
  .setTreasuryAccountId(treasuryAccountId)
  .setSupplyKey(supplyKey)
  .setAdminKey(adminKey);
```

### 2. NFT Minting
```typescript
// Mints an NFT with IPFS metadata URL
const mintTx = new TokenMintTransaction()
  .setTokenId(tokenId)
  .setMetadata([Buffer.from(ipfsMetadataUrl)])
  .sign(supplyKey);
```

### 3. Token Association
```typescript
// Associates token with user account (required before receiving NFTs)
const associateTx = new TokenAssociateTransaction()
  .setAccountId(userAccountId)
  .setTokenIds([tokenId])
  .sign(userPrivateKey);
```

### 4. NFT Transfer
```typescript
// Transfers NFT from treasury to user
const transferTx = new TransferTransaction()
  .addNftTransfer(tokenId, serialNumber, treasuryAccountId, userAccountId)
  .sign(treasuryPrivateKey);
```

## Metadata Format

NFT metadata follows the standard format and is stored on IPFS:

```json
{
  "name": "My NFT",
  "description": "Description of the NFT",
  "image": "https://gateway.pinata.cloud/ipfs/QmHash",
  "attributes": [
    {
      "trait_type": "Tag",
      "value": "art"
    }
  ],
  "properties": {
    "creator": "0.0.123456",
    "tags": ["art", "digital"],
    "originalFileName": "image.jpg",
    "fileSize": 1024000,
    "uploadDate": "2024-01-01T00:00:00.000Z"
  }
}
```

## Troubleshooting

### Common Issues

1. **"Token not associated"**: User accounts must associate with the token before receiving NFTs
2. **"Invalid supply key"**: Ensure the supply key is correctly formatted and matches the collection
3. **"Insufficient balance"**: Ensure accounts have enough HBAR for transaction fees
4. **"Token not found"**: Verify the collection ID is correct and the collection exists

### Checking NFT Status

Use the test script to verify NFT creation:
```bash
npm run test-nft
```

Or check manually on HashScan:
- Collection: `https://hashscan.io/testnet/token/YOUR_TOKEN_ID`
- Specific NFT: `https://hashscan.io/testnet/token/YOUR_TOKEN_ID/SERIAL_NUMBER`

## Security Notes

1. **Supply Key**: Keep the supply key secure - it controls NFT minting
2. **Private Keys**: Never expose private keys in client-side code
3. **Environment Variables**: Use proper environment variable management
4. **Key Rotation**: Consider implementing key rotation for production use

## Next Steps

1. Test the complete flow with the test script
2. Verify NFTs appear on HashScan
3. Test the upload functionality in the web application
4. Implement proper error handling for production use
