import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { backendService } from '@/services/backendService';
import { toast } from '@/hooks/use-toast';

interface NFTData {
  tokenId: string;
  serialNumber: number;
  accountId: string;
  metadata: any;
  createdAt: string;
  metadataContent?: any;
  imageUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

interface TransferNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFTData | null;
  onTransferComplete?: () => void;
}

export const TransferNFTModal: React.FC<TransferNFTModalProps> = ({
  isOpen,
  onClose,
  nft,
  onTransferComplete
}) => {
  const [recipientAccountId, setRecipientAccountId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    success: boolean;
    transactionId?: string;
    error?: string;
  } | null>(null);

  const handleClose = () => {
    setRecipientAccountId('');
    setTransferResult(null);
    onClose();
  };

  const validateAccountId = (accountId: string): boolean => {
    // Basic Hedera account ID validation (0.0.xxxxx format)
    const accountIdRegex = /^0\.0\.\d+$/;
    return accountIdRegex.test(accountId.trim());
  };

  const handleTransfer = async () => {
    if (!nft) return;

    const trimmedAccountId = recipientAccountId.trim();
    
    if (!trimmedAccountId) {
      toast({
        title: "Invalid Input",
        description: "Please enter a recipient account ID",
        variant: "destructive",
      });
      return;
    }

    if (!validateAccountId(trimmedAccountId)) {
      toast({
        title: "Invalid Account ID",
        description: "Please enter a valid Hedera account ID (format: 0.0.xxxxx)",
        variant: "destructive",
      });
      return;
    }

    if (trimmedAccountId === nft.accountId) {
      toast({
        title: "Invalid Transfer",
        description: "You cannot transfer an NFT to yourself",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    setTransferResult(null);

    try {
      console.log(`🔄 Transferring NFT #${nft.serialNumber} to ${trimmedAccountId}`);
      
      const response = await backendService.transferNFT({
        serialNumber: nft.serialNumber,
        toAccountId: trimmedAccountId
      });

      if (response.success && response.data) {
        setTransferResult({
          success: true,
          transactionId: response.data.transactionId
        });

        toast({
          title: "Transfer Successful!",
          description: `NFT #${nft.serialNumber} has been transferred to ${trimmedAccountId}`,
        });

        // Call the completion callback after a short delay
        setTimeout(() => {
          onTransferComplete?.();
          handleClose();
        }, 3000);

      } else {
        throw new Error(response.error || 'Transfer failed');
      }

    } catch (error) {
      console.error('Transfer error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setTransferResult({
        success: false,
        error: errorMessage
      });

      toast({
        title: "Transfer Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const openTransactionOnHashScan = (transactionId: string) => {
    const hashScanUrl = `https://hashscan.io/testnet/transaction/${transactionId}`;
    window.open(hashScanUrl, '_blank');
  };

  if (!nft) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transfer NFT
          </DialogTitle>
          <DialogDescription>
            Transfer your NFT to another Hedera account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* NFT Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {nft.metadataContent?.name || `NFT #${nft.serialNumber}`}
              </h4>
              <Badge variant="secondary">#{nft.serialNumber}</Badge>
            </div>
            {nft.metadataContent?.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {nft.metadataContent.description}
              </p>
            )}
          </div>

          {/* Transfer Form */}
          {!transferResult && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="recipient">Recipient Account ID</Label>
                <Input
                  id="recipient"
                  placeholder="0.0.123456"
                  value={recipientAccountId}
                  onChange={(e) => setRecipientAccountId(e.target.value)}
                  disabled={isTransferring}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the Hedera account ID in format: 0.0.xxxxx
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. Make sure the recipient account ID is correct and that the account is associated with the token.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Transfer Result */}
          {transferResult && (
            <div className="space-y-3">
              {transferResult.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Transfer Successful!</strong><br />
                    Your NFT has been transferred successfully.
                    {transferResult.transactionId && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-green-700 hover:text-green-900"
                        onClick={() => openTransactionOnHashScan(transferResult.transactionId!)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on HashScan
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Transfer Failed:</strong><br />
                    {transferResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!transferResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isTransferring}>
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={isTransferring || !recipientAccountId.trim()}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer NFT
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
