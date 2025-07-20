import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, Calendar, Image, Video, Grid3X3 } from 'lucide-react';
import { SearchFilters } from '@/types/hedera';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const popularTags = ['art', 'photography', 'music', 'video', 'nature', 'portrait', 'landscape', 'abstract'];

  const handleSearch = () => {
    const filters: SearchFilters = {
      query: query.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      mediaType,
      sortBy,
    };
    onSearch(filters);
  };

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedTags([]);
    setMediaType('all');
    setSortBy('newest');
    onSearch({});
  };

  return (
    <div className="space-y-4 p-6 rounded-xl bg-card border shadow-card">
      {/* Main Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search media by title, description, or creator..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary/70"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Media Type Filter */}
        <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
          <SelectTrigger className="w-32 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                All Media
              </div>
            </SelectItem>
            <SelectItem value="image">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Images
              </div>
            </SelectItem>
            <SelectItem value="video">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-32 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Newest
              </div>
            </SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border" />

        {/* Clear Filters */}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filters
        </Button>
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Selected tags:</span>
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 cursor-pointer"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Popular Tags */}
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Popular tags:</span>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-accent/20 hover:border-accent transition-colors"
              onClick={() => addTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};