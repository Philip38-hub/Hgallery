import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers } from 'ethers';
import { WalletConnection } from '@/types/hedera';
import { hashConnectService, HashPackConnectionState } from '@/services/hashConnectService';
import { toast } from '@/hooks/use-toast';

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  pairingString: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isWalletConnected: boolean;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: string) => Promise<string>;
  getEthersProvider: () => ethers.BrowserProvider | null;
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
  const [pairingString, setPairingString] = useState('');

  const updateWalletState = (hashConnectState: HashPackConnectionState) => {
    if (hashConnectState.isConnected && hashConnectState.accountId) {
      const walletConnection: WalletConnection = {
        accountId: hashConnectState.accountId,
        isConnected: true,
        network: hashConnectState.network
      };
      setWallet(walletConnection);
      localStorage.setItem('hedera_wallet', JSON.stringify(walletConnection));
    } else {
      setWallet(null);
      localStorage.removeItem('hedera_wallet');
    }
    setPairingString(hashConnectState.pairingString);
  };
  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      await hashConnectService.connectWallet();
      
      toast({
        title: "Wallet Connected",
        description: "HashPack wallet connection initiated",
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
    hashConnectService.disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected from wallet",
    });
  };

  const signTransaction = async (transaction: any): Promise<any> => {
    try {
      return await hashConnectService.signTransaction(transaction);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    try {
      return await hashConnectService.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };
  // Check for existing connection on mount
  useEffect(() => {
    // Set up HashConnect state listener
    const unsubscribe = hashConnectService.onStateChange(updateWalletState);
    
    // Initialize with current state
    updateWalletState(hashConnectService.getState());
    
    return unsubscribe;
  }, []);

  const getEthersProvider = useCallback(() => {
    if (hashConnectService.isWalletConnected()) {
      // DAppConnector's internal provider can be used with ethers.BrowserProvider
      // Assuming dappConnector.getProvider() or similar exists and returns a compatible provider
      // If not, we might need to construct one from window.ethereum or similar
      // For WalletConnect v2, the provider is usually accessible via the connector instance
      // Let's assume hashConnectService.dappConnector.getProvider() exists or we can pass the raw provider
      // Based on the DAppConnector source, it exposes a provider property
      return new ethers.BrowserProvider(hashConnectService.getEthersProvider());
    }
    return null;
  }, []);

  const value: WalletContextType = {
    wallet,
    isConnecting,
    pairingString,
    connectWallet,
    disconnectWallet,
    signTransaction,
    signMessage,
    isWalletConnected: wallet?.isConnected || false,
    getEthersProvider,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};