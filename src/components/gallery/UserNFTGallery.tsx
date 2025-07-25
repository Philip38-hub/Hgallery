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
      // Get account balance to find NFTs
      const balanceResponse = await backendService.getAccountBalance(wallet.accountId);
      
      if (!balanceResponse.success || !balanceResponse.data) {
        throw new Error('Failed to get account balance');
      }

      const tokens = balanceResponse.data.tokens;
      const tokenInfoResponse = await backendService.getTokenInfo();
      
      if (!tokenInfoResponse.success || !tokenInfoResponse.data) {
        throw new Error('Failed to get token info');
      }

      const collectionTokenId = tokenInfoResponse.data.tokenId;
      
      // Check if user has any NFTs from our collection
      const userNFTCount = tokens[collectionTokenId] || 0;
      
      if (userNFTCount === 0) {
        setNfts([]);
        return;
      }

      // For now, we'll need to iterate through possible serial numbers
      // In a production app, you'd use the Hedera Mirror Node API for this
      const userNFTs: NFTData[] = [];
      
      // Get token info to find total supply
      const totalSupply = parseInt(tokenInfoResponse.data.totalSupply);
      
      // Check each NFT to see if it belongs to the user
      // Note: This is not efficient for large collections
      // In production, use Mirror Node API to query NFTs by owner
      for (let serial = 1; serial <= Math.min(totalSupply, 100); serial++) {
        try {
          const nftResponse = await backendService.getNFTInfo(serial);
          
          if (nftResponse.success && nftResponse.data && 
              nftResponse.data.accountId === wallet.accountId) {
            
            const nftData: NFTData = {
              ...nftResponse.data,
              metadataContent: null,
              imageUrl: null
            };

            // Load metadata content if it's an IPFS URL
            if (nftData.metadata?.metadataUrl) {
              try {
                const metadataUrl = nftData.metadata.metadataUrl;
                if (metadataUrl.startsWith('ipfs://')) {
                  const hash = metadataUrl.replace('ipfs://', '');
                  const metadataContent = await ipfsService.getJSON(hash);
                  nftData.metadataContent = metadataContent;
                  
                  // Extract image URL
                  if (metadataContent.image) {
                    if (metadataContent.image.startsWith('ipfs://')) {
                      const imageHash = metadataContent.image.replace('ipfs://', '');
                      nftData.imageUrl = ipfsService.getGatewayUrl(imageHash);
                    } else {
                      nftData.imageUrl = metadataContent.image;
                    }
                  }
                }
              } catch (metadataError) {
                console.warn(`Failed to load metadata for NFT ${serial}:`, metadataError);
              }
            }

            userNFTs.push(nftData);
          }
        } catch (nftError) {
          // NFT might not exist or be accessible, continue
          console.debug(`NFT ${serial} not found or not accessible`);
        }
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
