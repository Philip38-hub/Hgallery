import React, { useState } from 'react';
import { MediaNFT } from '@/types/hedera';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, AlertCircle } from 'lucide-react';

interface SimpleMediaPlayerProps {
  media: MediaNFT;
  className?: string;
}

export const SimpleMediaPlayer: React.FC<SimpleMediaPlayerProps> = ({
  media,
  className = ""
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);

  // Multiple IPFS gateways for better reliability
  const ipfsGateways = [
    `https://ipfs.io/ipfs/${media.ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${media.ipfsHash}`,
    `https://dweb.link/ipfs/${media.ipfsHash}`,
    `https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`,
    `https://4everland.io/ipfs/${media.ipfsHash}`
  ];

  const ipfsUrl = ipfsGateways[currentGatewayIndex];
  const isVideo = media.metadata.mediaType === 'video';
  const isAudio = media.metadata.mediaType === 'audio';

  const handleError = (error: any) => {
    console.error('Media playback error with gateway:', ipfsUrl, error);

    if (currentGatewayIndex < ipfsGateways.length - 1) {
      console.log(`🔄 Trying next gateway (${currentGatewayIndex + 1}/${ipfsGateways.length})`);
      setCurrentGatewayIndex(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
    } else {
      console.error('❌ All gateways failed for media:', media.metadata.title);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setHasError(false);
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

  if (hasError) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className} flex items-center justify-center`}>
        <div className="text-center text-white p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium mb-2">Playback Error</h3>
          <p className="text-sm text-gray-300 mb-4">
            Unable to load media. This might be due to:
          </p>
          <ul className="text-xs text-gray-400 mb-6 text-left max-w-sm">
            <li>• IPFS gateway issues</li>
            <li>• Unsupported media format</li>
            <li>• Network connectivity problems</li>
            <li>• CORS restrictions</li>
          </ul>
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
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading media...</p>
          </div>
        </div>
      )}

      {isVideo ? (
        <video
          key={`video-${currentGatewayIndex}`}
          src={ipfsUrl}
          className="w-full h-full object-contain"
          controls
          preload="none"
          playsInline
          muted
          onError={handleError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={() => console.log('Video metadata loaded:', media.metadata.title)}
        >
          {/* Multiple source formats for better compatibility */}
          <source src={ipfsUrl} type="video/mp4" />
          <source src={ipfsUrl} type="video/webm" />
          <source src={ipfsUrl} type="video/ogg" />
          <p className="text-white p-4">
            Your browser doesn't support HTML5 video.
            <a href={ipfsUrl} className="underline ml-1">Download the video</a> instead.
          </p>
        </video>
      ) : isAudio ? (
        <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M13.828 8.172a1 1 0 011.414 0A5.983 5.983 0 0117 12a5.983 5.983 0 01-1.758 3.828 1 1 0 11-1.414-1.414A3.987 3.987 0 0015 12a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-lg">{media.metadata.title}</h3>
            <p className="text-white/70 text-sm">{media.metadata.creator}</p>
          </div>
          
          <audio
            key={`audio-${currentGatewayIndex}`}
            src={ipfsUrl}
            controls
            preload="metadata"
            crossOrigin="anonymous"
            onError={handleError}
            onLoadStart={handleLoadStart}
            onCanPlay={handleCanPlay}
            onLoadedMetadata={() => console.log('Audio metadata loaded:', media.metadata.title)}
            className="w-full max-w-md"
          >
            <p className="text-white">
              Your browser doesn't support HTML5 audio. 
              <a href={ipfsUrl} className="underline ml-1">Download the audio</a> instead.
            </p>
          </audio>
        </div>
      ) : (
        <img
          src={ipfsUrl}
          alt={media.metadata.title}
          className="w-full h-full object-contain"
          onError={handleError}
          onLoad={handleCanPlay}
        />
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
    </div>
  );
};
