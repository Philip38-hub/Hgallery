import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { backendService } from '@/services/backendService';
import { toast } from '@/hooks/use-toast';
import { 
  TokenAssociateTransaction, 
  AccountId, 
  TokenId 
} from '@hashgraph/sdk';

interface TokenAssociationProps {
  onAssociationComplete?: () => void;
}

export const TokenAssociation: React.FC<TokenAssociationProps> = ({ 
  onAssociationComplete 
}) => {
  const { wallet, isWalletConnected, hashConnectService } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isAssociated, setIsAssociated] = useState<boolean | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);

  // Check token association status when wallet connects
  useEffect(() => {
    if (isWalletConnected && wallet?.accountId) {
      checkTokenAssociation();
      loadTokenInfo();
    }
  }, [isWalletConnected, wallet?.accountId]);

  const loadTokenInfo = async () => {
    try {
      const response = await backendService.getTokenInfo();
      if (response.success && response.data) {
        setTokenInfo(response.data);
      }
    } catch (error) {
      console.error('Error loading token info:', error);
    }
  };

  const checkTokenAssociation = async () => {
    if (!wallet?.accountId) return;

    setIsCheckingAssociation(true);
    try {
      const balanceResponse = await backendService.getAccountBalance(wallet.accountId);
      
      if (balanceResponse.success && balanceResponse.data) {
        // Check if the token exists in the account's token map
        const tokens = balanceResponse.data.tokens;
        const tokenInfo = await backendService.getTokenInfo();
        
        if (tokenInfo.success && tokenInfo.data) {
          const hasToken = tokens && Object.prototype.hasOwnProperty.call(tokens, tokenInfo.data.tokenId);
          setIsAssociated(hasToken);
        }
      }
    } catch (error) {
      console.error('Error checking token association:', error);
      setIsAssociated(false);
    } finally {
      setIsCheckingAssociation(false);
    }
  };

  const associateToken = async () => {
    if (!isWalletConnected || !wallet?.accountId || !hashConnectService) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your HashPack wallet first.",
        variant: "destructive",
      });
      return;
    }

    if (!tokenInfo) {
      toast({
        title: "Token Info Missing",
        description: "Unable to load token information.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating token association transaction...');
      
      // Create token association transaction
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(wallet.accountId))
        .setTokenIds([TokenId.fromString(tokenInfo.tokenId)])
        .setTransactionMemo('Hgallery NFT Collection Association');

      console.log('Signing transaction with HashConnect...');
      
      // Sign and execute transaction through HashConnect
      const transactionId = await hashConnectService.signTransaction(associateTx);
      
      console.log('Token association successful:', transactionId);
      
      toast({
        title: "Token Associated Successfully!",
        description: `You can now receive NFTs from the ${tokenInfo.name} collection.`,
      });

      // Update association status
      setIsAssociated(true);
      
      // Call completion callback
      if (onAssociationComplete) {
        onAssociationComplete();
      }

    } catch (error) {
      console.error('Error associating token:', error);
      
      let errorMessage = 'Failed to associate token with your account.';
      if (error instanceof Error) {
        if (error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          errorMessage = 'Token is already associated with your account.';
          setIsAssociated(true);
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Association Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Token Association Required
          </CardTitle>
          <CardDescription>
            Connect your wallet to associate with the NFT collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your HashPack wallet to continue.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          NFT Collection Association
        </CardTitle>
        <CardDescription>
          Associate your account with the NFT collection to receive tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tokenInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collection:</span>
              <span className="text-sm">{tokenInfo.name} ({tokenInfo.symbol})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Token ID:</span>
              <span className="text-sm font-mono">{tokenInfo.tokenId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Supply:</span>
              <span className="text-sm">{tokenInfo.totalSupply}</span>
            </div>
          </div>
        )}

        {isCheckingAssociation ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking association status...
          </div>
        ) : isAssociated === true ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your account is already associated with this NFT collection. You can receive NFTs!
            </AlertDescription>
          </Alert>
        ) : isAssociated === false ? (
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your account needs to be associated with this NFT collection before you can receive tokens.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={associateToken}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Associating Token...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Associate Token
                </>
              )}
            </Button>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground">
          <p>
            Token association is a one-time process that allows your account to hold tokens from this collection.
            This transaction requires a small HBAR fee (~0.05 HBAR).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
