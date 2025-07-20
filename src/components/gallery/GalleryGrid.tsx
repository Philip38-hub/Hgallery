import React from 'react';
import { MediaCard } from './MediaCard';
import { MediaNFT } from '@/types/hedera';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface GalleryGridProps {
  media: MediaNFT[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMediaClick: (media: MediaNFT) => void;
  onRefresh?: () => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  media,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onMediaClick,
  onRefresh
}) => {
  if (isLoading && media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading gallery...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-20 h-20 rounded-full bg-gradient-primary/20 flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No media found</h3>
          <p className="text-muted-foreground max-w-md">
            No content matches your search criteria. Try adjusting your filters or upload some content to get started.
          </p>
        </div>
        {onRefresh && (
          <Button 
            onClick={onRefresh}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Gallery
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Gallery</h2>
          <p className="text-muted-foreground">
            {media.length} item{media.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {media.map((item) => (
          <MediaCard
            key={`${item.tokenId}-${item.serialNumber}`}
            media={item}
            onClick={() => onMediaClick(item)}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="border-primary/30 text-primary hover:bg-primary/10 min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* Loading overlay for more items */}
      {isLoading && media.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading more content...
          </div>
        </div>
      )}
    </div>
  );
};