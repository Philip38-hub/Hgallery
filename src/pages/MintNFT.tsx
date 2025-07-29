import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Wallet, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { WalletProvider } from '@/contexts/WalletContext';
import { useWallet } from '@/contexts/WalletContext';
import { TokenAssociation } from '@/components/wallet/TokenAssociation';
import { UploadModal } from '@/components/upload/UploadModal';
import { UserNFTGallery } from '@/components/gallery/UserNFTGallery';
import { backendService } from '@/services/backendService';
import { toast } from '@/hooks/use-toast';

const MintNFTContent: React.FC = () => {
  const { wallet, isWalletConnected, connectWallet } = useWallet();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState('associate');

  useEffect(() => {
    checkBackendStatus();
    loadTokenInfo();
  }, []);

  const checkBackendStatus = async () => {
    try {
      await backendService.healthCheck();
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('offline');
    }
  };

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

  const handleUploadComplete = (tokenId: string) => {
    toast({
      title: "NFT Minted Successfully!",
      description: "Your NFT has been minted and is now available in your gallery.",
    });
    
    // Switch to gallery tab to show the new NFT
    setActiveTab('gallery');
  };

  const openHashScan = () => {
    if (tokenInfo) {
      const network = 'testnet'; // or get from env
      const url = `https://hashscan.io/${network}/token/${tokenInfo.tokenId}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mint Your NFT
            </h1>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Associate account to token collection</li>
              <li>Upload your media</li>
              <li>Mint it as an NFT on Hedera</li>
              <li>View and manage your NFTs/Media</li>
            </ul>
          </div>

          {/* Backend Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    backendStatus === 'online' ? 'bg-green-500' : 
                    backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-medium">
                    Backend Service: {
                      backendStatus === 'online' ? 'Online' :
                      backendStatus === 'offline' ? 'Offline' : 'Checking...'
                    }
                  </span>
                </div>
                
                {tokenInfo && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {tokenInfo.name} ({tokenInfo.symbol})
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openHashScan}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {backendStatus === 'offline' && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The backend minting service is not available. Please make sure the server is running on port 3001.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="associate" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Token Association
              </TabsTrigger>
              <TabsTrigger value="mint" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Mint NFT
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                My NFTs
              </TabsTrigger>
            </TabsList>

            {/* Mint NFT Tab */}
            <TabsContent value="mint" className="space-y-6">
              {!isWalletConnected ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Connect Your Wallet
                    </CardTitle>
                    <CardDescription>
                      Connect your HashPack wallet to start minting NFTs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={connectWallet} className="w-full">
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect HashPack Wallet
                    </Button>
                  </CardContent>
                </Card>
              ) : backendStatus !== 'online' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Service Unavailable
                    </CardTitle>
                    <CardDescription>
                      The minting service is currently unavailable
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please start the backend server by running: <code>npm run server</code>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload & Mint NFT
                    </CardTitle>
                    <CardDescription>
                      Upload your media file and mint it as an NFT on Hedera
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">✅ Wallet Connected</h4>
                        <p className="text-sm text-muted-foreground">
                          Account: {wallet?.accountId}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">✅ Backend Service Online</h4>
                        <p className="text-sm text-muted-foreground">
                          Ready to mint NFTs securely
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="w-full"
                      size="lg"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Start Minting Process
                    </Button>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Supported formats: Images (JPEG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV)</p>
                      <p>• Maximum file size: 50MB</p>
                      <p>• Files are stored on IPFS for decentralized access</p>
                      <p>• NFTs are minted directly to your account</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Token Association Tab */}
            <TabsContent value="associate">
              <TokenAssociation 
                onAssociationComplete={() => {
                  toast({
                    title: "Token Associated!",
                    description: "You can now receive NFTs from this collection.",
                  });
                }}
              />
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              <UserNFTGallery />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export const MintNFT: React.FC = () => {
  return (
    <WalletProvider>
      <MintNFTContent />
    </WalletProvider>
  );
};
