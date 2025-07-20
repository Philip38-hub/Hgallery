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

const Index = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaNFT | null>(null);
  const [filteredMedia, setFilteredMedia] = useState<MediaNFT[]>(mockMediaData);
  const [isSearching, setIsSearching] = useState(false);

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
    try {
      // In a real implementation, you would fetch NFTs from Hedera Mirror Node
      // For now, we'll use the mock data
      setFilteredMedia(mockMediaData);
    } catch (error) {
      console.error('Error loading gallery data:', error);
      toast({
        title: "Error Loading Gallery",
        description: "Failed to load gallery data. Please try again.",
        variant: "destructive",
      });
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
            isLoading={isSearching}
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
