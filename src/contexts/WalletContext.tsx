import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletConnection } from '@/types/hedera';
import { toast } from '@/hooks/use-toast';

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isWalletConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      // For now, we'll simulate wallet connection since HashPack package didn't install
      // In production, this would integrate with HashPack/HashConnect
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate connection time
      
      const mockConnection: WalletConnection = {
        accountId: '0.0.123456',
        isConnected: true,
        network: 'testnet'
      };
      
      setWallet(mockConnection);
      localStorage.setItem('hedera_wallet', JSON.stringify(mockConnection));
      
      toast({
        title: "Wallet Connected",
        description: `Connected to account ${mockConnection.accountId}`,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to HashPack wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem('hedera_wallet');
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected from wallet",
    });
  };

  // Check for existing connection on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('hedera_wallet');
    if (savedWallet) {
      try {
        const parsed = JSON.parse(savedWallet);
        setWallet(parsed);
      } catch (error) {
        console.error('Failed to parse saved wallet:', error);
        localStorage.removeItem('hedera_wallet');
      }
    }
  }, []);

  const value: WalletContextType = {
    wallet,
    isConnecting,
    connectWallet,
    disconnectWallet,
    isWalletConnected: wallet?.isConnected || false,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};