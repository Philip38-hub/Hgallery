import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { EnhancedMediaPlayer } from '../media/EnhancedMediaPlayer';
import { SimpleMediaPlayer } from '../media/SimpleMediaPlayer';
import { RobustVideoPlayer } from '../media/RobustVideoPlayer';
import { MediaNFT } from '@/types/hedera';

// Test video NFT data
const testVideoNFT: MediaNFT = {
  tokenId: '0.0.test',
  serialNumber: 999,
  accountId: '0.0.test',
  ipfsHash: 'bafybeie6vc3ubb46fp64doa6au5exa3dtnf3xkbduxj6lkhrntsifzrjp4', // This should be a video hash
  transactionId: 'test@123456789',
  createdAt: new Date().toISOString(),
  metadata: {
    title: 'Test Video',
    description: 'A test video to verify video player functionality',
    tags: ['test', 'video'],
    mediaType: 'video',
    originalFileName: 'test-video.mp4',
    fileSize: 1024000,
    uploadDate: new Date().toISOString(),
    creator: '0.0.test'
  }
};

// Alternative test with a known working video URL
const testVideoWithDirectURL: MediaNFT = {
  ...testVideoNFT,
  ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', // Fallback to a known hash
  metadata: {
    ...testVideoNFT.metadata,
    title: 'Test Video (Direct URL)',
    description: 'Testing with a direct video URL'
  }
};

interface VideoPlayerTestProps {
  realVideoNFT?: MediaNFT | null;
}

export const VideoPlayerTest: React.FC<VideoPlayerTestProps> = ({ realVideoNFT }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaNFT | null>(null);
  const [useDirectURL, setUseDirectURL] = useState(false);

  const openVideoTest = (useDirectURL: boolean = false) => {
    setUseDirectURL(useDirectURL);
    setSelectedVideo(useDirectURL ? testVideoWithDirectURL : testVideoNFT);
    setIsOpen(true);
  };

  const openRealVideoTest = () => {
    if (realVideoNFT) {
      console.log('🎬 Testing real video NFT:', realVideoNFT);
      console.log('🔗 IPFS URL:', `https://gateway.pinata.cloud/ipfs/${realVideoNFT.ipfsHash}`);
      setSelectedVideo(realVideoNFT);
      setIsOpen(true);
    }
  };

  const testIPFSUrl = async (nft: MediaNFT) => {
    const url = `https://gateway.pinata.cloud/ipfs/${nft.ipfsHash}`;
    console.log('🧪 Testing IPFS URL accessibility:', url);

    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log('✅ IPFS URL response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } catch (error) {
      console.error('❌ IPFS URL test failed:', error);
    }
  };

  const closeVideoTest = () => {
    setIsOpen(false);
    setSelectedVideo(null);
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Video Player Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Use these buttons to test video playback functionality:
      </p>
      
      <div className="flex gap-2 mb-4">
        {realVideoNFT && (
          <>
            <Button
              onClick={openRealVideoTest}
              variant="default"
            >
              Test Real Video NFT #{realVideoNFT.serialNumber}
            </Button>
            <Button
              onClick={() => testIPFSUrl(realVideoNFT)}
              variant="outline"
              size="sm"
            >
              Test IPFS URL
            </Button>
          </>
        )}

        <Button
          onClick={() => openVideoTest(false)}
          variant="outline"
        >
          Test Video Player (IPFS)
        </Button>

        <Button
          onClick={() => openVideoTest(true)}
          variant="outline"
        >
          Test Video Player (Direct URL)
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <p><strong>Note:</strong> If videos don't play, check the browser console for error messages.</p>
        <p>Common issues: IPFS gateway problems, unsupported video format, or CORS restrictions.</p>
      </div>

      {/* Video Test Modal */}
      <Dialog open={isOpen} onOpenChange={closeVideoTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>{selectedVideo?.metadata.title}</DialogTitle>
            <DialogDescription>{selectedVideo?.metadata.description}</DialogDescription>
          </VisuallyHidden>
          
          {selectedVideo && (
            <div className="p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{selectedVideo.metadata.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedVideo.metadata.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  IPFS Hash: {selectedVideo.ipfsHash}
                </p>
                <p className="text-xs text-muted-foreground">
                  URL: https://gateway.pinata.cloud/ipfs/{selectedVideo.ipfsHash}
                </p>
              </div>
              
              <div className="bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <EnhancedMediaPlayer 
                  media={selectedVideo}
                  className="w-full h-full"
                  onError={() => console.error('Enhanced player failed for test video')}
                />
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Fallback: Simple Player</h4>
                <div className="bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <SimpleMediaPlayer
                    media={selectedVideo}
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Robust Player (Multiple Fallbacks)</h4>
                <div className="bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <RobustVideoPlayer
                    media={selectedVideo}
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button onClick={closeVideoTest}>Close Test</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
