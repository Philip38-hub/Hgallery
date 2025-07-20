# Hedera Decentralized Gallery MVP

A decentralized video and photo gallery built on the Hedera blockchain with React, featuring NFT minting, IPFS storage, and HashPack wallet integration.

## Features

- **Wallet Integration**: Connect with HashPack wallet for Hedera blockchain interaction
- **NFT Minting**: Upload content and mint as NFTs using Hedera Token Service
- **IPFS Storage**: Decentralized storage for media files and metadata
- **Search & Filter**: Advanced search with tags, dates, and content types
- **Responsive Design**: Modern, mobile-friendly interface
- **Blockchain Verification**: Content authenticity through blockchain verification

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Blockchain**: Hedera Hashgraph (Testnet)
- **Storage**: IPFS
- **Wallet**: HashPack integration
- **Icons**: Lucide React

## Prerequisites

1. **HashPack Wallet**: Install the HashPack browser extension
2. **Hedera Account**: Create a testnet account with some test HBAR
3. **IPFS Service**: Set up with Infura or similar provider (optional)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   
5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### For Viewers (No Wallet Required)
- Browse the gallery to view all uploaded content
- Use the search functionality to find specific content
- View detailed information about each piece
- Download content directly from IPFS

### For Creators (Wallet Required)
1. Connect your HashPack wallet
2. Navigate to the Upload section
3. Select a photo or video file
4. Add title, description, and tags
5. Upload to mint as an NFT on Hedera

## Architecture

### Components
- `WalletProvider`: Manages wallet connection state
- `Header`: Navigation and wallet connection
- `GalleryView`: Main gallery display with stats
- `SearchView`: Search interface and results
- `UploadForm`: Content upload and NFT minting
- `ContentViewer`: Modal for viewing content details

### Services
- `HederaService`: Blockchain interactions and NFT minting
- `IPFSService`: File storage and thumbnail generation
- `SearchService`: Local content indexing and search

### Data Flow
1. User uploads content → IPFS storage
2. Metadata creation → NFT minting on Hedera
3. Content indexing → Local search database
4. Gallery display → IPFS content retrieval

## Development Plan

### Phase 1: Core Setup ✅
- React project structure
- Hedera SDK integration
- HashPack wallet connection
- Basic UI components

### Phase 2: Upload & Storage ✅
- IPFS integration
- File upload handling
- NFT minting workflow
- Thumbnail generation

### Phase 3: Search & Display ✅
- Content indexing
- Search functionality
- Gallery grid layout
- Content viewer modal

### Phase 4: Enhancements (Future)
- Mirror node integration
- Advanced filtering
- User profiles
- Content moderation
- Mobile app version

## Known Limitations

1. **Local Storage**: Content metadata is stored locally (localStorage)
2. **Testnet Only**: Currently configured for Hedera testnet
3. **File Size**: Large files may impact performance
4. **IPFS Dependency**: Requires external IPFS service

## Production Considerations

1. **Backend Integration**: Implement proper backend for content indexing
2. **Mirror Node**: Use Hedera Mirror Node for blockchain queries
3. **CDN**: Implement CDN for better performance
4. **Security**: Enhance key management and authentication
5. **Monitoring**: Add error tracking and analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
