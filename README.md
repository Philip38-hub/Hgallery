# Hedera Decentralized Gallery MVP

A complete decentralized video and photo gallery built on the Hedera blockchain with React, featuring NFT minting, IPFS storage, HashPack wallet integration, and advanced media playback capabilities.

## Features

- **HashPack Wallet Integration**: Full HashConnect integration for secure wallet connection
- **NFT Minting**: Upload content and mint as NFTs using Hedera Token Service (HTS)
- **IPFS Storage**: Decentralized storage for media files and metadata via Pinata
- **Advanced Media Player**: Enhanced video/audio player with custom controls, seeking, volume control, and fullscreen support
- **Media Viewer**: Modal-based media viewer with player switching and download capabilities
- **Search & Filter**: Advanced search with tags, dates, and content types
- **Responsive Design**: Modern, mobile-friendly interface with optimized media controls
- **Blockchain Verification**: Content authenticity through blockchain verification
- **Content Management**: Personal dashboard for managing your NFT collection
- **Real-time Updates**: Live connection status and transaction feedback
- **Multiple Player Fallbacks**: Robust media playback with enhanced and simple player options

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions + Express.js fallback
- **Database**: PostgreSQL (Supabase)
- **Blockchain**: Hedera Hashgraph (Testnet/Mainnet)
- **Storage**: IPFS via Pinata
- **Wallet**: HashPack via HashConnect
- **Deployment**: Netlify (Frontend) + Supabase (Backend)
- **Icons**: Lucide React

## 🚀 Quick Deploy

### Option 1: Automated Setup
```bash
npm install
cp .env.example .env
# Fill in your environment variables in .env
tsx scripts/setup-deployment.ts
```

### Option 2: Manual Deployment
1. **Deploy to Supabase**: Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. **Deploy to Netlify**: Connect your GitHub repo to Netlify
3. **Configure Environment Variables**: Set all required variables in both platforms

### Option 3: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/hgallery)

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Backend Setup](./BACKEND_SETUP.md) - Backend configuration details
- [MVP Demo Guide](./MVP_DEMO_GUIDE.md) - Demo walkthrough
- [NFT Setup Guide](./NFT_SETUP_GUIDE.md) - NFT collection setup

## Prerequisites

1. **HashPack Wallet**: Install the HashPack browser extension
2. **Hedera Account**: Create a testnet account with some test HBAR
3. **Pinata Account**: Set up IPFS storage with Pinata

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   # Hedera Network Configuration
   HEDERA_NETWORK=testnet
   HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
   HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

   # Pinata IPFS Configuration
   VITE_PINATA_JWT=YOUR_PINATA_JWT_TOKEN
   VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud

   # HashConnect Configuration
   VITE_HASHCONNECT_APP_NAME=Hedera Gallery
   VITE_HASHCONNECT_APP_DESCRIPTION=Decentralized Media NFT Gallery
   VITE_HASHCONNECT_ICON_URL=https://your-domain.com/icon.png

   # Deployed Contract and Collection IDs (will be set after deployment)
   VITE_NFT_CONTRACT_ID=
   NFT_COLLECTION_ID=
   ```
   
5. **Deploy Smart Contract and Create NFT Collection**:
   Navigate to the `smart_contract_minting` directory and deploy the NFT contract:
   ```bash
   cd smart_contract_minting
   npx hardhat run scripts/deployHgalleryNFT.ts --network hederaTestnet
   ```
   Note the `HgalleryNFT deployed to: 0x...` address from the output. This is your `VITE_NFT_CONTRACT_ID`.
   
   Update your root `.env` file with the deployed contract ID:
   ```env
   VITE_NFT_CONTRACT_ID=0x... (your deployed contract ID)
   ```

   Now, navigate back to the root directory and create the NFT collection:
   ```bash
   cd ..
   npm run create-collection
   ```
   Note the `Token ID: 0.0....` from the output. This is your `NFT_COLLECTION_ID`.

   Update your root `.env` file with the NFT collection ID:
   ```env
   NFT_COLLECTION_ID=0.0.... (your created token ID)
   ```

6. Start the development server:
   ```bash
   npm run server
   ```
7. Start the frontend in another terminal:
   ```bash
   npm run dev
   ```

## Usage

### For Viewers (No Wallet Required)
- Browse the gallery to view all uploaded content
- Use the search functionality to find specific content
- Click on any media to open the enhanced viewer modal
- **Video/Audio Playback**: Use the advanced media player with:
  - Play/pause controls
  - Seek bar for navigation
  - Volume control with mute toggle
  - Skip forward/backward buttons
  - Fullscreen mode (videos)
  - Download option
- Switch between Enhanced and Simple players if needed

### For Creators (Wallet Required)
1. Connect your HashPack wallet
2. Click "Upload" or navigate to "My Content"
3. Select a photo, video, or audio file
4. Add title, description, and tags
5. Upload to IPFS and mint as an NFT on Hedera
6. View and manage your collection in "My Content"
7. Test your media with the integrated player before and after minting

## Media Player Features

### Enhanced Media Player
- **Custom Controls**: Professional-grade media controls with smooth animations
- **Seek Bar**: Click or drag to navigate through content
- **Volume Control**: Dedicated volume slider with mute toggle
- **Skip Controls**: 10-second forward/backward skip buttons
- **Fullscreen Support**: Native fullscreen mode for video content
- **Auto-hide Controls**: Controls fade out during playback for immersive viewing
- **Download Integration**: Direct download from IPFS with original filename
- **Error Handling**: Automatic fallback to simple player on errors
- **Multiple Formats**: Support for various video and audio formats
- **IPFS Optimization**: Multiple gateway fallbacks for reliable content delivery

### Simple Media Player
- **Native HTML5 Controls**: Browser-native controls for maximum compatibility
- **Fallback Option**: Automatic activation when enhanced player fails
- **Cross-browser Support**: Works across all modern browsers
- **Accessibility**: Full keyboard and screen reader support

### Media Viewer Modal
- **Responsive Design**: Optimized for all screen sizes
- **Player Switching**: Toggle between Enhanced and Simple players
- **Metadata Display**: Rich information panel with NFT details
- **Social Features**: Copy links, view on IPFS, download options
- **Keyboard Navigation**: Full keyboard support for accessibility

## Architecture

### Components
- `WalletProvider`: Manages HashConnect wallet state
- `Header`: Navigation and wallet connection
- `GalleryView`: Main gallery display with stats
- `SearchView`: Search interface and results
- `UploadForm`: Content upload and NFT minting
- `MediaViewer`: Advanced modal for viewing content with media player integration
- `EnhancedMediaPlayer`: Full-featured video/audio player with custom controls
- `SimpleMediaPlayer`: Fallback player using native HTML5 controls
- `MyContent`: Personal content management dashboard

### Services
- `HederaService`: Complete Hedera SDK integration for NFT operations
- `IPFSService`: Pinata integration for decentralized storage
- `HashConnectService`: HashPack wallet connection and transaction signing

### Data Flow
1. User uploads content → Pinata IPFS storage
2. Metadata creation → Upload to IPFS
3. NFT minting → Hedera Token Service
4. Transaction signing → HashPack wallet
5. Gallery display → IPFS content retrieval
6. Content management → Personal dashboard

## Development Plan

### Phase 1: Foundation ✅
- React project structure
- Design system and UI components
- Basic UI components

### Phase 2: Blockchain Integration ✅
- Hedera SDK integration
- HashConnect wallet integration
- Real wallet connection and signing

### Phase 3: Storage & Upload ✅
- Pinata IPFS integration
- File upload handling
- NFT minting workflow

### Phase 4: Gallery & Search ✅
- Search functionality
- Gallery grid layout
- Content viewer modal

### Phase 5: Content Management ✅
- Personal content dashboard
- NFT collection management
- User profile and statistics

### Phase 6: Future Enhancements
- Mirror node integration
- Advanced filtering
- Content moderation
- Mobile app version
- Marketplace features
- Social features (likes, comments)

## Current Implementation

✅ **Complete Features:**
- HashPack wallet integration with HashConnect
- Real Hedera blockchain integration
- Pinata IPFS storage and retrieval
- NFT minting and management
- Content upload and viewing
- Personal content dashboard
- Search and filtering
- Responsive design
- **Advanced Media Player**: Full-featured video/audio player with:
  - Custom playback controls (play/pause, seek, volume)
  - Skip forward/backward (10 seconds)
  - Fullscreen support for videos
  - Download functionality
  - Auto-hiding controls during playback
  - Multiple IPFS gateway fallbacks
- **Media Viewer Modal**: Enhanced viewing experience with:
  - Player switching (Enhanced ↔ Simple)
  - Optimized controls layout
  - Proper overflow handling
  - Responsive design for all screen sizes

🔄 **Demo Limitations:**
- Uses mock data for gallery display
- Requires manual token collection setup
- Limited to testnet environment

## Production Considerations

1. **Mirror Node Integration**: Use Hedera Mirror Node for real NFT queries
2. **Mirror Node**: Use Hedera Mirror Node for blockchain queries
3. **Database**: Implement backend database for search optimization
4. **CDN**: Implement CDN for better IPFS performance
5. **Security**: Enhanced key management and rate limiting
6. **Monitoring**: Add comprehensive error tracking and analytics
7. **Scaling**: Implement pagination and virtual scrolling
8. **Moderation**: Content moderation and reporting system

## Environment Setup

### Hedera Testnet Setup
1. Create a Hedera testnet account at [portal.hedera.com](https://portal.hedera.com)
2. Fund your account with test HBAR from the faucet
3. Get your Account ID and Private Key
4. Set up environment variables

### Pinata Setup
1. Create account at [pinata.cloud](https://pinata.cloud)
2. Generate JWT token in API Keys section
3. Configure gateway URL (optional)
4. Set up environment variables

### HashPack Setup
1. Install HashPack browser extension
2. Create or import Hedera account
3. Switch to testnet in settings
4. Connect when prompted by the application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Notes

- Never commit private keys or sensitive credentials
- Use environment variables for all configuration
- Test thoroughly on testnet before mainnet deployment
- Implement proper error handling and user feedback
- Follow Hedera best practices for transaction handling

## License

MIT License - see LICENSE file for details