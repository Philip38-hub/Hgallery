import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadModal } from '@/components/upload/UploadModal';
import { MediaViewer } from '@/components/media/MediaViewer';
import { WalletProvider } from '@/contexts/WalletContext';
import { MediaNFT, SearchFilters } from '@/types/hedera';
import { hederaService } from '@/services/hederaService';
import { ipfsService } from '@/services/ipfsService';
import { backendService } from '@/services/backendService';
import { toast } from '@/hooks/use-toast';

// Mock data for demonstration
const mockMediaData: MediaNFT[] = [
  {
    tokenId: '0.0.123456',
    serialNumber: 1,
    accountId: '0.0.654321',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    transactionId: '0.0.123456@1641234567.123456789',
    createdAt: '2024-01-15T10:30:00Z',
    metadata: {
      title: 'Sunset Over Mountains',
      description: 'A breathtaking sunset captured over the mountain range, showcasing nature\'s incredible beauty.',
      tags: ['nature', 'landscape', 'sunset', 'mountains'],
      mediaType: 'image',
      originalFileName: 'sunset-mountains.jpg',
      fileSize: 2458934,
      uploadDate: '2024-01-15T10:30:00Z',
      creator: '0.0.654321'
    }
  },
  {
    tokenId: '0.0.123457',
    serialNumber: 1,
    accountId: '0.0.654322',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdH',
    transactionId: '0.0.123457@1641234568.123456789',
    createdAt: '2024-01-16T14:20:00Z',
    metadata: {
      title: 'Urban Street Art',
      description: 'Vibrant street art captured in the heart of the city.',
      tags: ['art', 'urban', 'photography', 'street'],
      mediaType: 'image',
      originalFileName: 'street-art.png',
      fileSize: 3421567,
      uploadDate: '2024-01-16T14:20:00Z',
      creator: '0.0.654322'
    }
  },
  {
    tokenId: '0.0.123458',
    serialNumber: 1,
    accountId: '0.0.654323',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdI',
    transactionId: '0.0.123458@1641234569.123456789',
    createdAt: '2024-01-17T09:15:00Z',
    metadata: {
      title: 'Ocean Waves Time-lapse',
      description: 'Mesmerizing time-lapse of ocean waves during golden hour.',
      tags: ['nature', 'ocean', 'video', 'time-lapse'],
      mediaType: 'video',
      originalFileName: 'ocean-waves.mp4',
      fileSize: 15678432,
      uploadDate: '2024-01-17T09:15:00Z',
      creator: '0.0.654323'
    }
  }
];

// Utility function to convert backend NFT data to MediaNFT format
const convertNFTToMediaNFT = (nft: any): MediaNFT | null => {
  try {
    console.log(`🔄 Converting NFT #${nft.serialNumber}:`, nft);

    // Check if we have metadata content from the backend
    const metadataContent = nft.metadataContent;
    if (!metadataContent) {
      console.warn(`NFT #${nft.serialNumber} has no metadata content`);
      return null;
    }

    // Extract image hash from metadata - handle both ipfs:// and gateway URLs
    let ipfsHash = '';
    if (metadataContent.image) {
      if (metadataContent.image.startsWith('ipfs://')) {
        ipfsHash = metadataContent.image.replace('ipfs://', '');
      } else if (metadataContent.image.includes('/ipfs/')) {
        // Handle gateway URLs like https://gateway.pinata.cloud/ipfs/hash
        const ipfsIndex = metadataContent.image.indexOf('/ipfs/');
        ipfsHash = metadataContent.image.substring(ipfsIndex + 6); // +6 for '/ipfs/'
      } else {
        console.warn(`NFT #${nft.serialNumber} has unsupported image URL format:`, metadataContent.image);
        return null;
      }
    } else {
      console.warn(`NFT #${nft.serialNumber} has no image URL in metadata`);
      return null;
    }

    // Determine media type from the image format or type field
    let mediaType: 'image' | 'video' = 'image';
    if (metadataContent.type) {
      if (metadataContent.type.startsWith('video/') || metadataContent.format === 'video') {
        mediaType = 'video';
      }
    }

    // Extract tags from various possible locations
    let tags: string[] = [];
    if (metadataContent.properties?.tags) {
      tags = metadataContent.properties.tags;
    } else if (metadataContent.attributes) {
      // Extract tags from attributes if they exist
      tags = metadataContent.attributes
        .filter((attr: any) => attr.trait_type === 'tag' || attr.trait_type === 'tags')
        .map((attr: any) => attr.value);
    }

    // Convert to MediaNFT format
    const mediaNFT: MediaNFT = {
      tokenId: nft.tokenId,
      serialNumber: nft.serialNumber,
      accountId: nft.accountId,
      ipfsHash: ipfsHash,
      transactionId: `${nft.tokenId}@${Date.now()}`, // Placeholder transaction ID
      createdAt: nft.createdAt,
      metadata: {
        title: metadataContent.name || `NFT #${nft.serialNumber}`,
        description: metadataContent.description || '',
        tags: tags,
        mediaType: mediaType,
        originalFileName: metadataContent.properties?.originalFileName || `nft-${nft.serialNumber}`,
        fileSize: metadataContent.properties?.fileSize || 0,
        uploadDate: metadataContent.properties?.uploadDate || nft.createdAt,
        creator: metadataContent.creator || metadataContent.properties?.creator || nft.accountId
      }
    };

    console.log(`✅ Successfully converted NFT #${nft.serialNumber} to MediaNFT:`, mediaNFT);
    return mediaNFT;
  } catch (error) {
    console.error(`Error converting NFT #${nft.serialNumber}:`, error);
    return null;
  }
};

const Index = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaNFT | null>(null);
  const [filteredMedia, setFilteredMedia] = useState<MediaNFT[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleSearch = async (filters: SearchFilters) => {
    setIsSearching(true);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filtered = [...mockMediaData];
    
    // Apply text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(media => 
        media.metadata.title.toLowerCase().includes(query) ||
        media.metadata.description.toLowerCase().includes(query) ||
        media.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply media type filter
    if (filters.mediaType && filters.mediaType !== 'all') {
      filtered = filtered.filter(media => media.metadata.mediaType === filters.mediaType);
    }
    
    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(media => 
        filters.tags!.some(tag => media.metadata.tags.includes(tag))
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'title':
            return a.metadata.title.localeCompare(b.metadata.title);
          default:
            return 0;
        }
      });
    }
    
    setFilteredMedia(filtered);
    setIsSearching(false);
    
    toast({
      title: "Search Complete",
      description: `Found ${filtered.length} item${filtered.length !== 1 ? 's' : ''}`,
    });
  };

  const handleUploadComplete = (tokenId: string) => {
    toast({
      title: "Upload Successful!",
      description: `Your media has been minted as NFT ${tokenId}`,
    });
    // Refresh gallery data
    loadGalleryData();
  };

  const loadGalleryData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading gallery data from blockchain...');

      // First, get token info to find total supply
      const tokenInfoResponse = await backendService.getTokenInfo();
      if (!tokenInfoResponse.success || !tokenInfoResponse.data) {
        console.warn('Failed to get token info, falling back to mock data');
        setFilteredMedia(mockMediaData);
        return;
      }

      const totalSupply = parseInt(tokenInfoResponse.data.totalSupply);
      console.log(`📊 Total supply: ${totalSupply}`);

      // Calculate offset to get the last 4 NFTs (most recently minted)
      const limit = 4;
      const offset = Math.max(0, totalSupply - limit);

      console.log(`🎯 Fetching last ${limit} NFTs (offset: ${offset})`);

      // Fetch the last 4 NFTs from the collection
      const response = await backendService.getCollectionNFTs(limit, offset);

      if (!response.success || !response.data) {
        console.warn('Failed to fetch collection NFTs, falling back to mock data');
        setFilteredMedia(mockMediaData);
        return;
      }

      console.log(`📦 Fetched ${response.data.nfts.length} NFTs from collection (serials ${offset + 1}-${offset + response.data.nfts.length})`);

      // Convert NFT data to MediaNFT format
      console.log(`🔄 Converting ${response.data.nfts.length} NFTs to MediaNFT format...`);
      const mediaResults = response.data.nfts.map(nft => convertNFTToMediaNFT(nft));

      // Filter out null results (failed conversions)
      const validMedia = mediaResults.filter((media): media is MediaNFT => media !== null);

      console.log(`✅ Successfully converted ${validMedia.length} NFTs to media format`);
      console.log('Valid media:', validMedia);

      if (validMedia.length === 0) {
        console.log('No valid NFTs found, using mock data for demonstration');
        setFilteredMedia(mockMediaData);
      } else {
        console.log(`🎉 Setting ${validMedia.length} real NFTs to display!`);
        setFilteredMedia(validMedia);
      }

    } catch (error) {
      console.error('Error loading gallery data:', error);
      toast({
        title: "Error Loading Gallery",
        description: "Failed to load gallery data. Showing demo content.",
        variant: "destructive",
      });
      // Fallback to mock data on error
      setFilteredMedia(mockMediaData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadGalleryData();
    toast({
      title: "Gallery Refreshed",
      description: "Showing all available media",
    });
  };

  // Load initial gallery data
  React.useEffect(() => {
    loadGalleryData();
  }, []);
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gradient-background">
        <Header onUploadClick={() => setIsUploadModalOpen(true)} />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 py-12">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Hedera Gallery
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover, upload, and trade media NFTs on the Hedera blockchain. 
              Every piece is authenticated and stored permanently on IPFS.
            </p>
          </div>

          {/* Search */}
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />

          {/* Gallery */}
          <GalleryGrid
            media={filteredMedia}
            isLoading={isLoading || isSearching}
            onMediaClick={setSelectedMedia}
            onRefresh={handleRefresh}
          />
        </main>

        {/* Modals */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />

        <MediaViewer
          media={selectedMedia}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      </div>
    </WalletProvider>
  );
};

export default Index;
