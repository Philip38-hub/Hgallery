import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadModal } from '@/components/upload/UploadModal';
import { MediaViewer } from '@/components/media/MediaViewer';
// import { VideoPlayerTest } from '@/components/test/VideoPlayerTest';
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
const convertNFTToMediaNFT = async (nft: any): Promise<MediaNFT | null> => {
  try {
    console.log(`🔄 Converting NFT #${nft.serialNumber}:`, nft);

    // Check if we have metadata content from the backend, if not fetch it from IPFS
    let metadataContent = nft.metadataContent;

    if (!metadataContent && nft.metadata?.metadataUrl) {
      console.log(`🔄 Fetching metadata content for NFT #${nft.serialNumber} from IPFS...`);
      try {
        const metadataUrl = nft.metadata.metadataUrl;
        if (metadataUrl.startsWith('ipfs://')) {
          const hash = metadataUrl.replace('ipfs://', '');
          // Try multiple IPFS gateways for better reliability
          const gateways = [
            `https://ipfs.io/ipfs/${hash}`,
            `https://gateway.pinata.cloud/ipfs/${hash}`,
            `https://cloudflare-ipfs.com/ipfs/${hash}`
          ];

          let metadataFetched = false;
          for (const gatewayUrl of gateways) {
            try {
              const response = await fetch(gatewayUrl);
              if (response.ok) {
                metadataContent = await response.json();
                console.log(`✅ Fetched metadata for NFT #${nft.serialNumber} from ${gatewayUrl}:`, metadataContent);
                metadataFetched = true;
                break;
              } else {
                console.warn(`❌ Gateway ${gatewayUrl} failed with status: ${response.status}`);
              }
            } catch (gatewayError) {
              console.warn(`❌ Gateway ${gatewayUrl} error:`, gatewayError);
            }
          }

          if (!metadataFetched) {
            console.warn(`❌ All gateways failed for NFT #${nft.serialNumber}`);
          }
        }
      } catch (fetchError) {
        console.warn(`❌ Error fetching metadata for NFT #${nft.serialNumber}:`, fetchError);
      }
    }

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
    let mediaType: 'image' | 'video' | 'audio' = 'image';

    // Check multiple possible sources for media type
    const typeIndicators = [
      metadataContent.type,
      metadataContent.format,
      metadataContent.mediaType,
      metadataContent.properties?.mediaType,
      metadataContent.properties?.type
    ].filter(Boolean);

    console.log(`🔍 NFT #${nft.serialNumber} type indicators:`, typeIndicators);
    console.log(`🔍 NFT #${nft.serialNumber} full metadata content:`, metadataContent);

    for (const indicator of typeIndicators) {
      if (typeof indicator === 'string') {
        const lowerIndicator = indicator.toLowerCase();
        if (lowerIndicator === 'video' || lowerIndicator.includes('video') || lowerIndicator.startsWith('video/')) {
          console.log(`🎬 NFT #${nft.serialNumber} detected as video from type indicator: ${indicator}`);
          mediaType = 'video';
          break;
        } else if (lowerIndicator === 'audio' || lowerIndicator.includes('audio') || lowerIndicator.startsWith('audio/')) {
          console.log(`🎵 NFT #${nft.serialNumber} detected as audio from type indicator: ${indicator}`);
          mediaType = 'audio';
          break;
        }
      }
    }

    // Also check file extension from image URL or filename
    const imageUrl = metadataContent.image || '';
    const fileName = metadataContent.properties?.originalFileName || '';
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

    console.log(`🔍 NFT #${nft.serialNumber} checking URLs:`, { imageUrl, fileName });

    if (mediaType === 'image') { // Only check extensions if type not already determined
      const urlsToCheck = [imageUrl, fileName].filter(Boolean);
      for (const url of urlsToCheck) {
        const lowerUrl = url.toLowerCase();
        console.log(`🔍 NFT #${nft.serialNumber} checking URL: ${url} (lowercase: ${lowerUrl})`);
        if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
          console.log(`🎬 NFT #${nft.serialNumber} detected as video from extension in: ${url}`);
          mediaType = 'video';
          break;
        } else if (audioExtensions.some(ext => lowerUrl.includes(ext))) {
          console.log(`🎵 NFT #${nft.serialNumber} detected as audio from extension in: ${url}`);
          mediaType = 'audio';
          break;
        }
      }
    }

    console.log(`📹 NFT #${nft.serialNumber} detected media type: ${mediaType}`);

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
      console.log('📋 Token info response:', tokenInfoResponse);

      if (!tokenInfoResponse.success || !tokenInfoResponse.data) {
        console.warn('❌ Failed to get token info, falling back to mock data');
        console.warn('Token info error:', tokenInfoResponse.error);
        setFilteredMedia(mockMediaData);
        return;
      }

      const totalSupply = parseInt(tokenInfoResponse.data.totalSupply);
      console.log(`📊 Total supply: ${totalSupply}`);

      // Fetch all NFTs from the collection for the landing page gallery
      const limit = Math.min(totalSupply, 50); // Limit to 50 for performance, can be increased
      const offset = 0; // Start from the beginning

      console.log(`🎯 Fetching ${limit} NFTs from collection (total supply: ${totalSupply})`);

      // Fetch NFTs from the collection
      const response = await backendService.getCollectionNFTs(limit, offset);
      console.log('📦 Collection NFTs response:', response);

      if (!response.success || !response.data) {
        console.warn('❌ Failed to fetch collection NFTs, falling back to mock data');
        console.warn('Collection NFTs error:', response.error);
        setFilteredMedia(mockMediaData);
        return;
      }

      console.log(`📦 Fetched ${response.data.nfts?.length || 0} NFTs from collection (serials ${offset + 1}-${offset + (response.data.nfts?.length || 0)})`);
      console.log('🔍 Raw NFT data:', response.data.nfts);

      // Convert NFT data to MediaNFT format
      console.log(`🔄 Converting ${response.data.nfts?.length || 0} NFTs to MediaNFT format...`);
      const mediaPromises = (response.data.nfts || []).map(async (nft) => {
        console.log('🔄 Converting NFT:', nft);
        const result = await convertNFTToMediaNFT(nft);
        console.log('✅ Converted to:', result);
        return result;
      });

      // Wait for all conversions to complete
      const mediaResults = await Promise.all(mediaPromises);

      // Filter out null results (failed conversions)
      const validMedia = mediaResults.filter((media): media is MediaNFT => media !== null);

      console.log(`✅ Successfully converted ${validMedia.length} NFTs to media format`);
      console.log('📋 Final media data:', validMedia);
      console.log('Valid media:', validMedia);

      // Log video NFTs specifically
      const videoNFTs = validMedia.filter(media => media.metadata.mediaType === 'video');
      if (videoNFTs.length > 0) {
        console.log('🎬 Found video NFTs:', videoNFTs);
        videoNFTs.forEach(video => {
          console.log(`📹 Video NFT #${video.serialNumber}:`, {
            title: video.metadata.title,
            mediaType: video.metadata.mediaType,
            ipfsHash: video.ipfsHash,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${video.ipfsHash}`
          });
        });
      } else {
        console.log('⚠️ No video NFTs found in collection');
        console.log('🔍 Checking media types:', validMedia.map(m => ({
          serial: m.serialNumber,
          type: m.metadata.mediaType,
          ipfsHash: m.ipfsHash
        })));
      }

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
    <div className="min-h-screen bg-gradient-background">
      <Header onUploadClick={() => setIsUploadModalOpen(true)} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Hedera Gallery
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover, upload, and trade media NFTs on the Hedera blockchain.<br/>
            <strong>Record History a fresh.</strong>
          </p>
        </div>

        {/* Search */}
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />

        {/* Video Player Test Component */}
        {/* <div className="mb-8">
          <VideoPlayerTest
            realVideoNFT={filteredMedia.find(media =>
              media.metadata.mediaType === 'video' ||
              media.serialNumber === 13
            ) || null}
          />
        </div> */}

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
  );
};

export default Index;
