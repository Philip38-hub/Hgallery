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

interface NFTData {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: any;
  createdAt: string;
  metadataContent?: any;
  imageUrl?: string;
}

interface UserNFTGalleryProps {
  onNFTSelect?: (nft: NFTData) => void;
}

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
      for (const nft of userNFTs) {
        // Load metadata content if not already available
        if (!nft.metadataContent && nft.metadata?.metadataUrl) {
          try {
            const metadataUrl = nft.metadata.metadataUrl;
            if (metadataUrl.startsWith('ipfs://')) {
              const hash = metadataUrl.replace('ipfs://', '');
              const metadataContent = await ipfsService.getJSON(hash);
              nft.metadataContent = metadataContent;

              // Extract image URL
              if (metadataContent.image) {
                if (metadataContent.image.startsWith('ipfs://')) {
                  const imageHash = metadataContent.image.replace('ipfs://', '');
                  nft.imageUrl = ipfsService.getGatewayUrl(imageHash);
                } else {
                  nft.imageUrl = metadataContent.image;
                }
              }
            }
          } catch (metadataError) {
            console.warn(`Failed to load metadata for NFT ${nft.serialNumber}:`, metadataError);
          }
        } else if (nft.metadataContent?.image) {
          // Extract image URL from existing metadata
          if (nft.metadataContent.image.startsWith('ipfs://')) {
            const imageHash = nft.metadataContent.image.replace('ipfs://', '');
            nft.imageUrl = ipfsService.getGatewayUrl(imageHash);
          } else {
            nft.imageUrl = nft.metadataContent.image;
          }
        }
      }

      console.log('✅ Loaded metadata for', userNFTs.length, 'NFTs');
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
                    <img
                      src={nft.imageUrl}
                      alt={nft.metadataContent?.name || `NFT #${nft.serialNumber}`}
                      className="w-full h-48 object-cover"
                    />
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
                      <Badge variant="secondary">#{nft.serialNumber}</Badge>
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
