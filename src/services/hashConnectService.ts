import { HashConnect, HashConnectTypes, MessageTypes } from '@hashpack/hashconnect';
import { AccountId, LedgerId } from '@hashgraph/sdk';

export interface HashPackConnectionState {
  isConnected: boolean;
  accountId: string | null;
  network: string;
  topic: string;
  pairingString: string;
}

export class HashConnectService {
  private hashConnect: HashConnect;
  private appMetadata: HashConnectTypes.AppMetadata;
  private state: HashPackConnectionState;
  private listeners: ((state: HashPackConnectionState) => void)[] = [];

  constructor() {
    this.hashConnect = new HashConnect();
    
    this.appMetadata = {
      name: import.meta.env.VITE_HASHCONNECT_APP_NAME || 'Hedera Gallery',
      description: import.meta.env.VITE_HASHCONNECT_APP_DESCRIPTION || 'Decentralized Media NFT Gallery',
      icons: [import.meta.env.VITE_HASHCONNECT_ICON_URL || '/favicon.ico'],
      url: window.location.origin
    };

    this.state = {
      isConnected: false,
      accountId: null,
      network: 'testnet',
      topic: '',
      pairingString: ''
    };

    this.initializeHashConnect();
  }

  private async initializeHashConnect() {
    try {
      // Initialize HashConnect
      const initData = await this.hashConnect.init(this.appMetadata);
      this.state.topic = initData.topic;
      this.state.pairingString = initData.pairingString;

      // Set up event listeners
      this.hashConnect.pairingEvent.on((data) => {
        console.log('Pairing event:', data);
        if (data.accountIds && data.accountIds.length > 0) {
          this.state.isConnected = true;
          this.state.accountId = data.accountIds[0];
          this.state.network = data.network;
          this.notifyListeners();
        }
      });

      this.hashConnect.disconnectionEvent.on(() => {
        console.log('Disconnection event');
        this.state.isConnected = false;
        this.state.accountId = null;
        this.notifyListeners();
      });

      this.hashConnect.connectionStatusChangeEvent.on((state) => {
        console.log('Connection status change:', state);
        this.state.isConnected = state === HashConnectTypes.ConnectionState.Paired;
        this.notifyListeners();
      });

      // Check for existing connections
      const savedData = this.hashConnect.hcData;
      if (savedData.pairedAccounts && savedData.pairedAccounts.length > 0) {
        const pairedAccount = savedData.pairedAccounts[0];
        this.state.isConnected = true;
        this.state.accountId = pairedAccount.accountIds[0];
        this.state.network = pairedAccount.network;
        this.notifyListeners();
      }

    } catch (error) {
      console.error('Error initializing HashConnect:', error);
    }
  }

  async connectWallet(): Promise<void> {
    try {
      if (this.state.isConnected) {
        return;
      }

      // Open HashPack for pairing
      this.hashConnect.connectToLocalWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect to HashPack wallet');
    }
  }

  async disconnectWallet(): Promise<void> {
    try {
      await this.hashConnect.disconnect(this.state.topic);
      this.state.isConnected = false;
      this.state.accountId = null;
      this.notifyListeners();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  async signTransaction(transaction: any): Promise<any> {
    try {
      if (!this.state.isConnected || !this.state.accountId) {
        throw new Error('Wallet not connected');
      }

      const response = await this.hashConnect.sendTransaction(
        this.state.topic,
        {
          topic: this.state.topic,
          byteArray: transaction,
          metadata: {
            accountToSign: this.state.accountId,
            returnTransaction: false
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.state.isConnected || !this.state.accountId) {
        throw new Error('Wallet not connected');
      }

      const response = await this.hashConnect.sign(
        this.state.topic,
        this.state.accountId,
        message
      );

      return response.signedMessage;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  getState(): HashPackConnectionState {
    return { ...this.state };
  }

  getPairingString(): string {
    return this.state.pairingString;
  }

  onStateChange(callback: (state: HashPackConnectionState) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  isWalletConnected(): boolean {
    return this.state.isConnected;
  }

  getAccountId(): string | null {
    return this.state.accountId;
  }

  getNetwork(): string {
    return this.state.network;
  }
}

export const hashConnectService = new HashConnectService();