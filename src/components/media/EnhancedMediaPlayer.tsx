import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Download,
  Settings
} from 'lucide-react';
import { MediaNFT } from '@/types/hedera';

interface EnhancedMediaPlayerProps {
  media: MediaNFT;
  className?: string;
  onError?: () => void;
}

export const EnhancedMediaPlayer: React.FC<EnhancedMediaPlayerProps> = ({
  media,
  className = "",
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Multiple IPFS gateways for better reliability
  const ipfsGateways = [
    `https://ipfs.io/ipfs/${media.ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${media.ipfsHash}`,
    `https://dweb.link/ipfs/${media.ipfsHash}`,
    `https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`,
    `https://ipfs.filebase.io/ipfs/${media.ipfsHash}`
  ];

  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const ipfsUrl = ipfsGateways[currentGatewayIndex];
  const isVideo = media.metadata.mediaType === 'video';
  const isAudio = media.metadata.mediaType === 'audio';

  // Handle gateway fallback on error
  const handleMediaError = (error: any) => {
    console.error('Media error with gateway:', ipfsUrl, error);

    if (currentGatewayIndex < ipfsGateways.length - 1) {
      console.log(`🔄 Trying next gateway (${currentGatewayIndex + 1}/${ipfsGateways.length})`);
      setCurrentGatewayIndex(prev => prev + 1);
      setHasError(false);
    } else {
      console.error('❌ All gateways failed for media:', media.metadata.title);
      setHasError(true);
      if (onError) {
        onError();
      }
    }
  };

  useEffect(() => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    const updateTime = () => setCurrentTime(mediaElement.currentTime);
    const updateDuration = () => {
      setDuration(mediaElement.duration);
      console.log('Media duration loaded:', mediaElement.duration);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      console.log('Media playback ended');
    };
    const handleError = (e: Event) => {
      console.error('Media playback error:', e);
      setIsPlaying(false);
      if (onError) {
        onError();
      }
    };
    const handleLoadStart = () => {
      console.log('Media load started for:', media.metadata.title);
    };
    const handleCanPlay = () => {
      console.log('Media can play:', media.metadata.title);
    };

    mediaElement.addEventListener('timeupdate', updateTime);
    mediaElement.addEventListener('loadedmetadata', updateDuration);
    mediaElement.addEventListener('ended', handleEnded);
    mediaElement.addEventListener('error', handleError);
    mediaElement.addEventListener('loadstart', handleLoadStart);
    mediaElement.addEventListener('canplay', handleCanPlay);

    return () => {
      mediaElement.removeEventListener('timeupdate', updateTime);
      mediaElement.removeEventListener('loadedmetadata', updateDuration);
      mediaElement.removeEventListener('ended', handleEnded);
      mediaElement.removeEventListener('error', handleError);
      mediaElement.removeEventListener('loadstart', handleLoadStart);
      mediaElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [media.metadata.title]);

  const togglePlay = async () => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    try {
      if (isPlaying) {
        mediaElement.pause();
        setIsPlaying(false);
      } else {
        await mediaElement.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    const newTime = value[0];
    mediaElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    const newVolume = value[0];
    mediaElement.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    if (isMuted) {
      mediaElement.volume = volume;
      setIsMuted(false);
    } else {
      mediaElement.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    mediaElement.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
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

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Media Element */}
      {isVideo ? (
        <video
          key={`video-${currentGatewayIndex}`}
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={ipfsUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => console.log('Video metadata loaded')}
          onError={handleMediaError}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
        />
      ) : isAudio ? (
        <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <audio
            key={`audio-${currentGatewayIndex}`}
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={ipfsUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={() => console.log('Audio metadata loaded')}
            onError={handleMediaError}
            preload="metadata"
            crossOrigin="anonymous"
          />
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
            <h3 className="text-white font-medium">{media.metadata.title}</h3>
            <p className="text-white/70 text-sm">{media.metadata.creator}</p>
          </div>
        </div>
      ) : (
        <img
          src={ipfsUrl}
          alt={media.metadata.title}
          className="w-full h-full object-contain"
        />
      )}

      {/* Controls Overlay */}
      {(isVideo || isAudio) && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            padding: '12px 16px 16px 16px',
            minHeight: '80px',
            maxHeight: '120px'
          }}
        >
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/70 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Volume Control */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-16">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Download Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadMedia}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Fullscreen (Video only) */}
              {isVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
