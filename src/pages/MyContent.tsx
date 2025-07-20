import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Image, 
  Video, 
  Calendar, 
  Hash, 
  Download, 
  ExternalLink, 
  Trash2, 
  Edit,
  Eye,
  Share2,
  Copy,
  CheckCircle2,
  Loader2,
  Upload,
  Coins,
  TrendingUp
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { MediaNFT } from '@/types/hedera';
import { MediaViewer } from '@/components/media/MediaViewer';
import { UploadModal } from '@/components/upload/UploadModal';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// Mock user content data
const mockUserContent: MediaNFT[] = [
  {
    tokenId: '0.0.123456',
    serialNumber: 1,
    accountId: '0.0.654321',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    transactionId: '0.0.123456@1641234567.123456789',
    createdAt: '2024-01-15T10:30:00Z',
    metadata: {
      title: 'My Sunset Photography',
      description: 'A beautiful sunset I captured last weekend.',
      tags: ['photography', 'sunset', 'nature'],
      mediaType: 'image',
      originalFileName: 'sunset.jpg',
      fileSize: 2458934,
      uploadDate: '2024-01-15T10:30:00Z',
      creator: '0.0.654321'
    }
  },
  {
    tokenId: '0.0.123457',
    serialNumber: 1,
    accountId: '0.0.654321',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdH',
    transactionId: '0.0.123457@1641234568.123456789',
    createdAt: '2024-01-16T14:20:00Z',
    metadata: {
      title: 'City Timelapse',
      description: 'A timelapse of the city during rush hour.',
      tags: ['video', 'timelapse', 'city'],
      mediaType: 'video',
      originalFileName: 'city-timelapse.mp4',
      fileSize: 15678432,
      uploadDate: '2024-01-16T14:20:00Z',
      creator: '0.0.654321'
    }
  }
];

const MyContent = () => {
  const { wallet, isWalletConnected } = useWallet();
  const [userContent, setUserContent] = useState<MediaNFT[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaNFT | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isWalletConnected && wallet) {
      loadUserContent();
    }
  }, [isWalletConnected, wallet]);

  const loadUserContent = async () => {
    setIsLoading(true);
    try {
      // Simulate loading user content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter content by current user
      const userNFTs = mockUserContent.filter(nft => nft.accountId === wallet?.accountId);
      setUserContent(userNFTs);
    } catch (error) {
      console.error('Error loading user content:', error);
      toast({
        title: "Error Loading Content",
        description: "Failed to load your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields(prev => ({ ...prev, [field]: true }));
      toast({
        title: "Copied to clipboard",
        description: `${field} copied successfully`,
      });
      setTimeout(() => {
        setCopiedFields(prev => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tokenId: string, serialNumber: number) => {
    try {
      // In a real app, you would implement NFT burning or transfer to a burn address
      toast({
        title: "Delete Requested",
        description: "NFT deletion is not implemented in this demo",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete NFT",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (media: MediaNFT) => {
    const shareUrl = `${window.location.origin}/nft/${media.tokenId}/${media.serialNumber}`;
    await copyToClipboard(shareUrl, 'Share URL');
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFilteredContent = () => {
    switch (activeTab) {
      case 'images':
        return userContent.filter(item => item.metadata.mediaType === 'image');
      case 'videos':
        return userContent.filter(item => item.metadata.mediaType === 'video');
      default:
        return userContent;
    }
  };

  const filteredContent = getFilteredContent();
  const totalImages = userContent.filter(item => item.metadata.mediaType === 'image').length;
  const totalVideos = userContent.filter(item => item.metadata.mediaType === 'video').length;

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-gradient-background">
        <Header onUploadClick={() => setIsUploadModalOpen(true)} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Please connect your HashPack wallet to view and manage your NFT content.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <Header onUploadClick={() => setIsUploadModalOpen(true)} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">My Content</h1>
              <p className="text-muted-foreground font-mono">{wallet?.accountId}</p>
            </div>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary/70"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload New Content
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total NFTs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold" />
                <span className="text-2xl font-bold">{userContent.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{totalImages}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-accent" />
                <span className="text-2xl font-bold">{totalVideos}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">1.2K</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">All ({userContent.length})</TabsTrigger>
            <TabsTrigger value="images">Images ({totalImages})</TabsTrigger>
            <TabsTrigger value="videos">Videos ({totalVideos})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading your content...</span>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto mb-6">
                  {activeTab === 'images' ? (
                    <Image className="w-10 h-10 text-primary" />
                  ) : activeTab === 'videos' ? (
                    <Video className="w-10 h-10 text-accent" />
                  ) : (
                    <Coins className="w-10 h-10 text-gold" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">No content found</h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'all' 
                    ? "You haven't uploaded any content yet."
                    : `You don't have any ${activeTab} uploaded yet.`
                  }
                </p>
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First {activeTab === 'all' ? 'Content' : activeTab.slice(0, -1)}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContent.map((media) => (
                  <Card key={`${media.tokenId}-${media.serialNumber}`} className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        {media.metadata.mediaType === 'image' ? (
                          <Image className="w-12 h-12 text-primary" />
                        ) : (
                          <Video className="w-12 h-12 text-accent" />
                        )}
                      </div>
                      <Badge 
                        className={`absolute top-2 right-2 ${
                          media.metadata.mediaType === 'video' 
                            ? 'bg-accent/90 text-accent-foreground' 
                            : 'bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {media.metadata.mediaType}
                      </Badge>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      <div>
                        <h3 className="font-semibold line-clamp-1">{media.metadata.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {media.metadata.description}
                        </p>
                      </div>

                      {/* Tags */}
                      {media.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {media.metadata.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {media.metadata.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{media.metadata.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Token ID:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono">{media.tokenId}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(media.tokenId, `token-${media.tokenId}`)}
                              className="p-1 h-auto"
                            >
                              {copiedFields[`token-${media.tokenId}`] ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>Serial #:</span>
                          <span className="font-mono">#{media.serialNumber}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>File Size:</span>
                          <span>{formatFileSize(media.metadata.fileSize)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>Created:</span>
                          <span>{formatDistanceToNow(new Date(media.createdAt))} ago</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMedia(media)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(media)}
                          className="flex-1"
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => loadUserContent()}
      />

      <MediaViewer
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
};

export default MyContent;