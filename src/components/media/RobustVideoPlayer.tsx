import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MediaNFT } from '@/types/hedera';
import { Download, ExternalLink, AlertCircle, Play, Pause } from 'lucide-react';

interface RobustVideoPlayerProps {
  media: MediaNFT;
  className?: string;
}

export const RobustVideoPlayer: React.FC<RobustVideoPlayerProps> = ({ 
  media, 
  className = "" 
}) => {
  const [playerMode, setPlayerMode] = useState<'video' | 'iframe' | 'error'>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasTriedIframe, setHasTriedIframe] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`;
  const alternativeGateways = [
    `https://ipfs.io/ipfs/${media.ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${media.ipfsHash}`,
    `https://dweb.link/ipfs/${media.ipfsHash}`
  ];

  const handleVideoError = (error: any) => {
    console.error('Video playback failed:', error);
    console.error('Video URL:', ipfsUrl);
    
    if (!hasTriedIframe) {
      console.log('🔄 Trying iframe fallback...');
      setPlayerMode('iframe');
      setHasTriedIframe(true);
    } else {
      console.log('❌ All playback methods failed');
      setPlayerMode('error');
    }
  };

  const handleIframeError = () => {
    console.error('Iframe fallback also failed');
    setPlayerMode('error');
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(handleVideoError);
      }
    }
  };

  const downloadMedia = () => {
    const link = document.createElement('a');
    link.href = ipfsUrl;
    link.download = media.metadata.originalFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openIPFS = () => {
    window.open(ipfsUrl, '_blank');
  };

  const tryAlternativeGateway = (gatewayUrl: string) => {
    console.log('🔄 Trying alternative gateway:', gatewayUrl);
    setPlayerMode('video');
    setHasTriedIframe(false);
    
    // Update the video source
    if (videoRef.current) {
      videoRef.current.src = gatewayUrl;
      videoRef.current.load();
    }
  };

  if (playerMode === 'error') {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className} flex items-center justify-center`}>
        <div className="text-center text-white p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">Video Playback Failed</h3>
          <p className="text-sm text-gray-300 mb-4">
            Unable to play this video. This might be due to:
          </p>
          <ul className="text-xs text-gray-400 mb-6 text-left max-w-sm">
            <li>• Unsupported video codec or format</li>
            <li>• IPFS gateway connectivity issues</li>
            <li>• Browser compatibility problems</li>
            <li>• Corrupted video file</li>
          </ul>
          
          <div className="space-y-2 mb-4">
            <p className="text-xs text-gray-400">Try alternative IPFS gateways:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {alternativeGateways.map((gateway, index) => (
                <Button
                  key={index}
                  onClick={() => tryAlternativeGateway(gateway)}
                  variant="outline"
                  size="sm"
                  className="text-xs text-white border-white/30 hover:bg-white/10"
                >
                  Gateway {index + 1}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={downloadMedia}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={openIPFS}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in IPFS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {playerMode === 'video' ? (
        <video
          ref={videoRef}
          src={ipfsUrl}
          className="w-full h-full object-contain"
          controls
          preload="none"
          playsInline
          muted
          onError={handleVideoError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => console.log('✅ Video loaded successfully:', media.metadata.title)}
        >
          <source src={ipfsUrl} type="video/mp4" />
          <source src={ipfsUrl} type="video/webm" />
          <source src={ipfsUrl} type="video/ogg" />
          <p className="text-white p-4">
            Your browser doesn't support HTML5 video.
          </p>
        </video>
      ) : (
        <div className="w-full h-full">
          <iframe
            src={ipfsUrl}
            className="w-full h-full border-0"
            title={media.metadata.title}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts"
          />
          <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Iframe Mode
          </div>
        </div>
      )}

      {/* Action buttons overlay */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <Button
          onClick={downloadMedia}
          variant="secondary"
          size="sm"
          className="bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/70"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          onClick={openIPFS}
          variant="secondary"
          size="sm"
          className="bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/70"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Mode switcher */}
      <div className="absolute bottom-4 left-4">
        <Button
          onClick={() => setPlayerMode(playerMode === 'video' ? 'iframe' : 'video')}
          variant="secondary"
          size="sm"
          className="bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/70 text-xs"
        >
          {playerMode === 'video' ? 'Try Iframe' : 'Try Video'}
        </Button>
      </div>
    </div>
  );
};
