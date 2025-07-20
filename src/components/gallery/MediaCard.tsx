import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Calendar, Hash, Play, User } from 'lucide-react';
import { MediaNFT } from '@/types/hedera';
import { formatDistanceToNow } from 'date-fns';

interface MediaCardProps {
  media: MediaNFT;
  onClick: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${media.ipfsHash}`;
  const isVideo = media.metadata.mediaType === 'video';

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-primary/20 hover:scale-[1.02] hover:border-primary/50 bg-card/80 backdrop-blur-sm overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Media Preview */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {!imageError ? (
            <>
              {isVideo ? (
                <div className="relative w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <video
                    src={ipfsUrl}
                    className="w-full h-full object-cover"
                    onLoadedData={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={ipfsUrl}
                  alt={media.metadata.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}
              
              {/* Media Type Badge */}
              <Badge 
                className={`absolute top-2 right-2 ${
                  isVideo 
                    ? 'bg-accent/90 text-accent-foreground' 
                    : 'bg-primary/90 text-primary-foreground'
                }`}
              >
                {isVideo ? <Play className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {isVideo ? 'Video' : 'Image'}
              </Badge>
              
              {/* View Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2">
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="w-full bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Hash className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load media</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="p-4 space-y-3">
          {/* Title and Description */}
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {media.metadata.title}
            </h3>
            {media.metadata.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {media.metadata.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {media.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.metadata.tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs border-border/50 hover:border-accent/50 transition-colors"
                >
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

          {/* Creator and Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  <User className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-20">{media.accountId}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(media.createdAt))} ago</span>
            </div>
          </div>

          {/* File Info */}
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>{formatFileSize(media.metadata.fileSize)}</span>
            <span className="font-mono">#{media.serialNumber}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};