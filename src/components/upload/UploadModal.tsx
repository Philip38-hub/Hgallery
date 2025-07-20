import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, File, Image, Video, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/hooks/use-toast';
import { MediaMetadata, UploadProgress } from '@/types/hedera';
import { ipfsService } from '@/services/ipfsService';
import { hederaService } from '@/services/hederaService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (tokenId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUploadComplete 
}) => {
  const { wallet, isWalletConnected } = useWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Partial<MediaMetadata>>({
    title: '',
    description: '',
    tags: [],
  });
  const [currentTag, setCurrentTag] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov'];

  const resetForm = () => {
    setSelectedFile(null);
    setMetadata({ title: '', description: '', tags: [] });
    setCurrentTag('');
    setUploadProgress(null);
  };

  const handleClose = () => {
    if (uploadProgress?.status === 'uploading' || uploadProgress?.status === 'minting') {
      toast({
        title: "Upload in Progress",
        description: "Please wait for the current upload to complete.",
        variant: "destructive",
      });
      return;
    }
    resetForm();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxFileSize) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxFileSize / 1024 / 1024}MB.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setMetadata(prev => ({
      ...prev,
      originalFileName: file.name,
      fileSize: file.size,
      mediaType: file.type.startsWith('image/') ? 'image' : 'video',
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const addTag = () => {
    const tag = currentTag.trim().toLowerCase();
    if (tag && !metadata.tags?.includes(tag)) {
      setMetadata(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const simulateUpload = async () => {
    if (!selectedFile || !isWalletConnected || !wallet) {
      return;
    }

    const progress: UploadProgress = {
      file: selectedFile,
      progress: 0,
      status: 'uploading',
    };
    setUploadProgress(progress);

    try {
      // Upload file to IPFS
      setUploadProgress(prev => prev ? { ...prev, progress: 25 } : null);
      const fileUpload = await ipfsService.uploadFile(selectedFile);
      
      setUploadProgress(prev => prev ? { ...prev, progress: 50 } : null);
      
      // Create metadata and upload to IPFS
      const nftMetadata = {
        name: metadata.title || '',
        description: metadata.description || '',
        image: fileUpload.url,
        type: metadata.mediaType || 'image',
        properties: {
          creator: wallet.accountId,
          tags: metadata.tags || [],
          originalFileName: metadata.originalFileName || selectedFile.name,
          fileSize: selectedFile.size,
          uploadDate: new Date().toISOString()
        }
      };
      
      const metadataUpload = await ipfsService.uploadMetadata(nftMetadata);
      setUploadProgress(prev => prev ? { ...prev, progress: 75 } : null);

      // Mint NFT on Hedera
      setUploadProgress(prev => prev ? { ...prev, status: 'minting', progress: 0 } : null);
      
      // For demo purposes, we'll use a default collection token ID
      // In production, you'd either create a new collection or use an existing one
      const defaultTokenId = '0.0.123456'; // Replace with actual token ID
      
      const mintResult = await hederaService.mintNFT(
        defaultTokenId,
        nftMetadata,
        wallet.accountId
      );
      
      setUploadProgress(prev => prev ? { ...prev, progress: 100 } : null);

      // Complete
      setUploadProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
      
      toast({
        title: "Upload Successful!",
        description: `Your media has been minted as NFT ${mintResult.tokenId}#${mintResult.serialNumber}`,
      });

      setTimeout(() => {
        onUploadComplete?.(mintResult.tokenId);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
      } : null);
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was an error uploading your media. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isFormValid = selectedFile && metadata.title?.trim() && isWalletConnected;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
            Upload Media to Hedera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : selectedFile
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-border/80'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => !uploadProgress && document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept={allowedTypes.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              disabled={!!uploadProgress}
            />

            {selectedFile ? (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-accent mx-auto flex items-center justify-center">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="w-8 h-8 text-accent-foreground" />
                  ) : (
                    <Video className="w-8 h-8 text-accent-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploadProgress && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-primary mx-auto flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Drop your media here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: Images (JPEG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV)
                  <br />
                  Max file size: 50MB
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {uploadProgress.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : uploadProgress.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  <span className="font-medium">
                    {uploadProgress.status === 'uploading' && 'Uploading to IPFS...'}
                    {uploadProgress.status === 'minting' && 'Minting NFT on Hedera...'}
                    {uploadProgress.status === 'completed' && 'Upload Complete!'}
                    {uploadProgress.status === 'error' && 'Upload Failed'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {uploadProgress.progress}%
                </span>
              </div>
              <Progress value={uploadProgress.progress} className="h-2" />
              {uploadProgress.error && (
                <p className="text-sm text-destructive">{uploadProgress.error}</p>
              )}
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={metadata.title || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a title for your media"
                disabled={!!uploadProgress}
                className="bg-background/50"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={metadata.description || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your media (optional)"
                rows={3}
                disabled={!!uploadProgress}
                className="bg-background/50 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tags..."
                  disabled={!!uploadProgress}
                  className="bg-background/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                  disabled={!currentTag.trim() || !!uploadProgress}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-primary/30"
                    >
                      {tag}
                      {!uploadProgress && (
                        <X 
                          className="w-3 h-3 ml-1 cursor-pointer hover:text-primary/70" 
                          onClick={() => removeTag(tag)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadProgress?.status === 'uploading' || uploadProgress?.status === 'minting'}
              className="flex-1"
            >
              {uploadProgress?.status === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            
            {uploadProgress?.status !== 'completed' && (
              <Button
                onClick={simulateUpload}
                disabled={!isFormValid || !!uploadProgress}
                className="flex-1 bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary/70"
              >
                {uploadProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress.status === 'uploading' ? 'Uploading...' : 'Minting...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Mint NFT
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Wallet Warning */}
          {!isWalletConnected && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                Please connect your wallet to upload media and mint NFTs.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};