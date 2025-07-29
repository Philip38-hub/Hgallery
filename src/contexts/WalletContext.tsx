import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    // Check localStorage for existing wallet data first
    const checkStoredWallet = () => {
      try {
        const storedWallet = localStorage.getItem('hedera_wallet');
        if (storedWallet) {
          const walletData = JSON.parse(storedWallet);
          console.log('Found stored wallet data:', walletData);
          // Set the wallet state immediately for better UX
          setWallet(walletData);
        }
      } catch (error) {
        console.warn('Error reading stored wallet data:', error);
        localStorage.removeItem('hedera_wallet');
      }
    };

    // Initialize HashConnect
    const initializeHashConnect = async () => {
      try {
        await hashConnectService.initializeConnection();
        // Set up HashConnect state listener
        hashConnectService.addListener(updateWalletState);

        // Initialize with current state
        updateWalletState(hashConnectService.getState());
      } catch (error) {
        console.error('Failed to initialize HashConnect:', error);
      }
    };

    // Check stored wallet first for immediate feedback
    checkStoredWallet();

    // Then initialize HashConnect
    initializeHashConnect();

    // Cleanup function
    return () => {
      hashConnectService.removeListener(updateWalletState);
    };
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
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};