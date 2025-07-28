import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  X,
  Download,
  ExternalLink,
  Calendar,
  FileText,
  Hash,
  User,
  Shield,
  Coins,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { MediaNFT } from '@/types/hedera';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { EnhancedMediaPlayer } from './EnhancedMediaPlayer';

interface MediaViewerProps {
  media: MediaNFT | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ media, isOpen, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({});

  if (!media) return null;

  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`;
  const isVideo = media.metadata.mediaType === 'video';
  const isAudio = media.metadata.mediaType === 'audio';
  const isInteractiveMedia = isVideo || isAudio;

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden bg-card border-border">
        <div className="flex h-full">
          {/* Media Display */}
          <div className="flex-1 bg-black/20 flex items-center justify-center relative">
            {isInteractiveMedia ? (
              <EnhancedMediaPlayer
                media={media}
                className="w-full h-full"
              />
            ) : (
              <img
                src={ipfsUrl}
                alt={media.metadata.title}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setImageLoaded(true)}
              />
            )}
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Metadata Panel */}
          <div className="w-96 bg-card border-l border-border overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold leading-tight">{media.metadata.title}</h2>
                  <Badge 
                    variant="outline" 
                    className={`${
                      isVideo 
                        ? 'border-accent/50 text-accent' 
                        : 'border-primary/50 text-primary'
                    }`}
                  >
                    {media.metadata.mediaType}
                  </Badge>
                </div>
                
                {media.metadata.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {media.metadata.description}
                  </p>
                )}
              </div>

              <Separator />

              {/* Creator Info */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Creator
                </h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{media.accountId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(media.accountId, 'Account ID')}
                        className="p-1 h-auto"
                      >
                        {copiedFields['Account ID'] ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Hedera Account</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              {media.metadata.tags.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {media.metadata.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="bg-primary/20 text-primary border-primary/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* NFT Details */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-gold" />
                  NFT Details
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Token ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{media.tokenId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(media.tokenId, 'Token ID')}
                        className="p-1 h-auto"
                      >
                        {copiedFields['Token ID'] ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial Number:</span>
                    <span className="font-mono">#{media.serialNumber}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transaction:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs truncate max-w-20">
                        {media.transactionId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(media.transactionId, 'Transaction ID')}
                        className="p-1 h-auto"
                      >
                        {copiedFields['Transaction ID'] ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* File Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  File Information
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Name:</span>
                    <span className="truncate max-w-32" title={media.metadata.originalFileName}>
                      {media.metadata.originalFileName}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size:</span>
                    <span>{formatFileSize(media.metadata.fileSize)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upload Date:</span>
                    <span>{formatDistanceToNow(new Date(media.createdAt))} ago</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IPFS Hash:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs truncate max-w-20">
                        {media.ipfsHash}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(media.ipfsHash, 'IPFS Hash')}
                        className="p-1 h-auto"
                      >
                        {copiedFields['IPFS Hash'] ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={downloadMedia}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary/70"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Media
                </Button>
                
                <Button
                  variant="outline"
                  onClick={openIPFS}
                  className="w-full border-accent/30 text-accent hover:bg-accent/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on IPFS
                </Button>
              </div>

              {/* Verification Badge */}
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Blockchain Verified</span>
                </div>
                <p className="text-xs text-green-400/70 mt-1">
                  This media is authenticated on the Hedera blockchain
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};