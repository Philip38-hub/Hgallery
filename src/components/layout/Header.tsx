import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Upload, LogOut, Zap } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

interface HeaderProps {
  onUploadClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadClick }) => {
  const { wallet, isConnecting, connectWallet, disconnectWallet, isWalletConnected } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-primary">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Hedera Gallery
            </h1>
            <p className="text-xs text-muted-foreground">Decentralized Media NFTs</p>
          </div>
        </div>

        {/* Navigation and Actions */}
        <div className="flex items-center gap-4">
          {/* Network Badge */}
          <Badge variant="outline" className="border-accent/30 text-accent">
            <div className="w-2 h-2 rounded-full bg-accent mr-2 animate-glow" />
            Testnet
          </Badge>

          {/* Upload Button - Only for connected wallets */}
          {isWalletConnected && (
            <Button
              onClick={onUploadClick}
              className="bg-gradient-accent text-accent-foreground shadow-accent hover:shadow-accent/70 transition-all duration-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}

          {/* Wallet Connection */}
          {isWalletConnected ? (
            <div className="flex items-center gap-2">
              <div className="text-right text-sm">
                <p className="font-medium">{wallet?.accountId}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary/70 transition-all duration-300"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};