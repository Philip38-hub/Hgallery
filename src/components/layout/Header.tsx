import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Upload, LogOut, Zap, User, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWallet } from '@/contexts/WalletContext';
import { useState } from 'react';

interface HeaderProps {
  onUploadClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadClick }) => {
  const { wallet, isConnecting, connectWallet, disconnectWallet, isWalletConnected, pairingString } = useWallet();
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between overflow-hidden">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            {/* <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div> */}
            <div className="mt-3">
              <img src="/logo.png" alt="Harchive Logo" className="h-40 w-auto"/>
              <p className="text-xs text-muted-foreground">Decentralized Media NFTs</p>
            </div>
          </Link>
        </div>

        {/* Navigation and Actions */}
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          {isWalletConnected && (
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Gallery
              </Link>
              <Link
                to="/mint"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/mint' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Mint NFT
              </Link>
            </nav>
          )}

          {/* Network Badge */}
          <Badge variant="outline" className="border-accent/30 text-accent">
            <div className="w-2 h-2 rounded-full bg-accent mr-2 animate-glow" />
            Testnet
          </Badge>

          {/* Upload Button - Only for connected wallets and when onUploadClick is provided */}
          {isWalletConnected && onUploadClick && (
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
              {/* My Content Link (Mobile) */}
              <Link to="/my-content" className="md:hidden">
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4" />
                </Button>
              </Link>
              
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

          {/* Pairing QR Code Dialog */}
          {pairingString && !isWalletConnected && (
            <Dialog open={showPairingDialog} onOpenChange={setShowPairingDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <QrCode className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect HashPack Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your HashPack mobile app or copy the pairing string.
                  </p>
                  <div className="p-4 bg-white rounded-lg">
                    {/* QR Code would be generated here */}
                    <div className="aspect-square bg-muted rounded flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pairing String:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pairingString}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs bg-muted rounded border font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(pairingString)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
};