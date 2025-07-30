import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Image as ImageIcon, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { backendService } from '@/services/backendService';
import { ipfsService } from '@/services/ipfsService';
import { toast } from '@/hooks/use-toast';

// Component for NFT images with fallback gateway support
const NFTImage: React.FC<{ nft: NFTData; className: string }> = ({ nft, className }) => {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Extract IPFS hash from image URL
  const getIpfsHash = (imageUrl: string): string | null => {
    if (imageUrl.includes('/ipfs/')) {
      const ipfsIndex = imageUrl.indexOf('/ipfs/');
      return imageUrl.substring(ipfsIndex + 6);
    }
    return null;
  };

  const ipfsHash = getIpfsHash(nft.imageUrl || '');

  // Debug logging for IPFS hash investigation
  console.log(`🔍 NFTImage #${nft.serialNumber}:`, {
    imageUrl: nft.imageUrl,
    ipfsHash,
    metadataContent: nft.metadataContent
  });

  // Special handling for the problematic hash
  if (ipfsHash === 'bafybeih75uquzyvamdjqcxzqeiig7cvmdrbrp7btsmpev7i4ftu6of76fe') {
    console.warn(`⚠️ NFT #${nft.serialNumber} is using a known problematic IPFS hash. This content may not exist on IPFS.`);
  }

  // Multiple IPFS gateways for fallback
  const ipfsGateways = ipfsHash ? [
    `https://ipfs.io/ipfs/${ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
    `https://dweb.link/ipfs/${ipfsHash}`,
    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    `https://4everland.io/ipfs/${ipfsHash}`
  ] : [nft.imageUrl || ''];

  const currentImageUrl = ipfsGateways[currentGatewayIndex];

  const handleImageError = () => {
    if (currentGatewayIndex < ipfsGateways.length - 1) {
      console.log(`🔄 UserNFTGallery: Trying next gateway for NFT #${nft.serialNumber} (${currentGatewayIndex + 1}/${ipfsGateways.length})`);
      setCurrentGatewayIndex(prev => prev + 1);
      setImageError(false);
    } else {
      console.error(`❌ UserNFTGallery: All gateways failed for NFT #${nft.serialNumber}. IPFS hash: ${ipfsHash}`);
      console.error(`❌ This might indicate the content was never uploaded or has been garbage collected from IPFS`);
      setImageError(true);
    }
  };

  if (imageError) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted-foreground/20">
        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground text-center font-medium">
          Media Unavailable
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mt-1">
          NFT #{nft.serialNumber}
        </p>
        {ipfsHash && (
          <p className="text-xs text-muted-foreground/50 text-center mt-2 font-mono">
            IPFS content not found
          </p>
        )}
      </div>
    );
  }

  // Render video or image based on media type
  if (nft.mediaType === 'video') {
    return (
      <video
        key={`nft-video-${currentGatewayIndex}`}
        src={currentImageUrl}
        className={className}
        onError={handleImageError}
        muted
        playsInline
        preload="metadata"
        poster="" // No poster for now
      />
    );
  }

  // Default to image
  return (
    <img
      key={`nft-image-${currentGatewayIndex}`}
      src={currentImageUrl}
      alt={nft.metadataContent?.name || `NFT #${nft.serialNumber}`}
      className={className}
      onError={handleImageError}
    />
  );
};

interface NFTData {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: any;
  createdAt: string;
  metadataContent?: any;
  imageUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

interface UserNFTGalleryProps {
  onNFTSelect?: (nft: NFTData) => void;
}

// Function to determine media type from metadata (same logic as landing page)
const determineMediaType = (metadataContent: any, nftSerialNumber: number): 'image' | 'video' | 'audio' => {
  let mediaType: 'image' | 'video' | 'audio' = 'image';

  // Check multiple possible sources for media type
  const typeIndicators = [
    metadataContent.type,
    metadataContent.format,
    metadataContent.mediaType,
    metadataContent.properties?.mediaType,
    metadataContent.properties?.type
  ].filter(Boolean);

  console.log(`🔍 UserNFTGallery NFT #${nftSerialNumber} type indicators:`, typeIndicators);

  for (const indicator of typeIndicators) {
    if (typeof indicator === 'string') {
      const lowerIndicator = indicator.toLowerCase();
      if (lowerIndicator === 'video' || lowerIndicator.includes('video') || lowerIndicator.startsWith('video/')) {
        console.log(`🎬 UserNFTGallery NFT #${nftSerialNumber} detected as video from type indicator: ${indicator}`);
        mediaType = 'video';
        break;
      } else if (lowerIndicator === 'audio' || lowerIndicator.includes('audio') || lowerIndicator.startsWith('audio/')) {
        console.log(`🎵 UserNFTGallery NFT #${nftSerialNumber} detected as audio from type indicator: ${indicator}`);
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

  console.log(`🔍 UserNFTGallery NFT #${nftSerialNumber} checking URLs:`, { imageUrl, fileName });

  if (mediaType === 'image') { // Only check extensions if type not already determined
    const urlsToCheck = [imageUrl, fileName].filter(Boolean);
    for (const url of urlsToCheck) {
      const lowerUrl = url.toLowerCase();
      console.log(`🔍 UserNFTGallery NFT #${nftSerialNumber} checking URL: ${url} (lowercase: ${lowerUrl})`);
      if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
        console.log(`🎬 UserNFTGallery NFT #${nftSerialNumber} detected as video from extension in: ${url}`);
        mediaType = 'video';
        break;
      } else if (audioExtensions.some(ext => lowerUrl.includes(ext))) {
        console.log(`🎵 UserNFTGallery NFT #${nftSerialNumber} detected as audio from extension in: ${url}`);
        mediaType = 'audio';
        break;
      }
    }
  }

  console.log(`📹 UserNFTGallery NFT #${nftSerialNumber} detected media type: ${mediaType}`);
  return mediaType;
};

export const UserNFTGallery: React.FC<UserNFTGalleryProps> = ({ onNFTSelect }) => {
  const { wallet, isWalletConnected } = useWallet();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isWalletConnected && wallet?.accountId) {
      loadUserNFTs();
      loadTokenInfo();
    }
  }, [isWalletConnected, wallet?.accountId]);

  const loadTokenInfo = async () => {
    try {
      const response = await backendService.getTokenInfo();
      if (response.success && response.data) {
        setTokenInfo(response.data);
      }
    } catch (error) {
      console.error('Error loading token info:', error);
    }
  };

  const loadUserNFTs = async () => {
    if (!wallet?.accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading NFTs for account:', wallet.accountId);

      // Get all NFTs from the collection
      const collectionResponse = await backendService.getCollectionNFTs(100, 0);

      if (!collectionResponse.success) {
        throw new Error(collectionResponse.error || 'Failed to fetch collection NFTs');
      }

      const allNFTs = collectionResponse.data?.nfts || [];
      console.log('📦 Found', allNFTs.length, 'NFTs in collection');

      // Filter NFTs owned by the current user
      const userNFTs: NFTData[] = allNFTs
        .filter((nft: any) => nft.accountId === wallet.accountId)
        .map((nft: any) => ({
          tokenId: nft.tokenId,
          serialNumber: nft.serialNumber,
          accountId: nft.accountId,
          metadata: nft.metadata,
          createdAt: nft.createdAt,
          metadataContent: nft.metadataContent,
        }));

      console.log('👤 User owns', userNFTs.length, 'NFTs');

      // Load metadata for each NFT
      console.log(`🔄 Loading metadata for ${userNFTs.length} user NFTs...`);
      for (const nft of userNFTs) {
        // Load metadata content if not already available
        if (!nft.metadataContent && nft.metadata?.metadataUrl) {
          try {
            const metadataUrl = nft.metadata.metadataUrl;
            console.log(`🔍 Loading metadata for NFT #${nft.serialNumber} from: ${metadataUrl}`);
            if (metadataUrl.startsWith('ipfs://')) {
              const hash = metadataUrl.replace('ipfs://', '');
              const metadataContent = await ipfsService.getJSON(hash);
              nft.metadataContent = metadataContent;
              console.log(`✅ Loaded metadata for NFT #${nft.serialNumber}:`, metadataContent);

              // Debug the image field specifically
              if (metadataContent.image) {
                console.log(`🖼️ NFT #${nft.serialNumber} image field:`, metadataContent.image);
                if (metadataContent.image.includes('bafybeih75uquzyvamdjqcxzqeiig7cvmdrbrp7btsmpev7i4ftu6of76fe')) {
                  console.warn(`⚠️ NFT #${nft.serialNumber} is using the problematic IPFS hash in metadata!`);
                }
              }

              // Determine media type from metadata
              nft.mediaType = determineMediaType(metadataContent, nft.serialNumber);

              // Extract image URL using more reliable gateway
              if (metadataContent.image) {
                if (metadataContent.image.startsWith('ipfs://')) {
                  const imageHash = metadataContent.image.replace('ipfs://', '');
                  // Use ipfs.io gateway which is more reliable for CORS
                  nft.imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                } else {
                  nft.imageUrl = metadataContent.image;
                }
              }
            }
          } catch (metadataError) {
            console.error(`❌ Failed to load metadata for NFT ${nft.serialNumber}:`, metadataError);
          }
        } else if (nft.metadataContent?.image) {
          // Determine media type from existing metadata
          nft.mediaType = determineMediaType(nft.metadataContent, nft.serialNumber);

          // Extract image URL from existing metadata using more reliable gateway
          if (nft.metadataContent.image.startsWith('ipfs://')) {
            const imageHash = nft.metadataContent.image.replace('ipfs://', '');
            // Use ipfs.io gateway which is more reliable for CORS
            nft.imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
          } else {
            nft.imageUrl = nft.metadataContent.image;
          }
        }
      }

      console.log('✅ Loaded metadata for', userNFTs.length, 'NFTs');

      // Check for NFTs with missing media
      const nftsWithMissingMedia = userNFTs.filter(nft =>
        nft.metadataContent?.image?.includes('bafybeih75uquzyvamdjqcxzqeiig7cvmdrbrp7btsmpev7i4ftu6of76fe')
      );

      if (nftsWithMissingMedia.length > 0) {
        console.warn(`⚠️ Found ${nftsWithMissingMedia.length} NFTs with potentially missing IPFS content:`,
          nftsWithMissingMedia.map(nft => `#${nft.serialNumber}`).join(', '));
      }

      setNfts(userNFTs);
      
    } catch (error) {
      console.error('Error loading user NFTs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadUserNFTs();
  };

  const openOnHashScan = (tokenId: string, serialNumber: number) => {
    const network = 'testnet'; // or get from env
    const url = `https://hashscan.io/${network}/token/${tokenId}/${serialNumber}`;
    window.open(url, '_blank');
  };

  if (!isWalletConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            My NFTs
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your NFT collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your HashPack wallet to view your NFTs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              My NFTs
            </CardTitle>
            <CardDescription>
              Your NFTs from the {tokenInfo?.name || 'Hgallery'} collection
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No NFTs Found</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any NFTs from this collection yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Mint your first NFT to see it here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts.map((nft) => (
              <Card key={`${nft.tokenId}-${nft.serialNumber}`} className="overflow-hidden">
                <CardContent className="p-0">
                  {nft.imageUrl ? (
                    <div className="relative">
                      <NFTImage
                        nft={nft}
                        className="w-full h-48 object-cover"
                      />
                      {/* Video play icon overlay */}
                      {nft.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="bg-white/90 rounded-full p-2">
                            <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {nft.metadataContent?.name || `NFT #${nft.serialNumber}`}
                      </h4>
                      <div className="flex gap-1">
                        {nft.mediaType && nft.mediaType !== 'image' && (
                          <Badge variant="outline" className="text-xs">
                            {nft.mediaType === 'video' ? '🎬' : '🎵'} {nft.mediaType}
                          </Badge>
                        )}
                        <Badge variant="secondary">#{nft.serialNumber}</Badge>
                      </div>
                    </div>
                    
                    {nft.metadataContent?.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {nft.metadataContent.description}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      {onNFTSelect && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNFTSelect(nft)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOnHashScan(nft.tokenId, nft.serialNumber)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
