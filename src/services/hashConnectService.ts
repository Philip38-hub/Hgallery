import { AccountId, LedgerId, Transaction, TransactionId } from '@hashgraph/sdk';
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';
import EventEmitter from "events";

export interface HashPackConnectionState {
  isConnected: boolean;
  accountId: string | null;
  network: string;
  topic: string;
  pairingString: string;
}

// Create a global event emitter for refresh events
const refreshEvent = new EventEmitter();

export class HashConnectService {
  private hashconnect: HashConnect;
  private state: HashPackConnectionState;
  private listeners: ((state: HashPackConnectionState) => void)[] = [];
  private pairingData: SessionData | null = null;
  private isInitialized: boolean = false;
  private appMetadata = {
    name: import.meta.env.VITE_HASHCONNECT_APP_NAME || 'Hedera Gallery',
    description: import.meta.env.VITE_HASHCONNECT_APP_DESCRIPTION || 'Decentralized Media NFT Gallery',
    icons: [import.meta.env.VITE_HASHCONNECT_ICON_URL || '/logo.png'],
    url: window.location.origin
  };

  constructor() {
    // Get WalletConnect project ID from environment
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'e8565b8bf2f3b8970efb537891f65f96';

    // Create HashConnect instance with correct v3 constructor
    this.hashconnect = new HashConnect(
      LedgerId.TESTNET,
      projectId,
      this.appMetadata,
      true // debug mode
    );

    this.state = {
      isConnected: false,
      accountId: null,
      network: 'testnet',
      topic: '',
      pairingString: ''
    };

    // Don't setup event listeners in constructor, do it in init
  }

  private setupEventListeners() {
    // Listen for pairing events
    this.hashconnect.pairingEvent.on((pairingData) => {
      console.log('Pairing event:', pairingData);
      this.pairingData = pairingData;

      // Update state with pairing information
      if (pairingData.accountIds && pairingData.accountIds.length > 0) {
        this.state.accountId = pairingData.accountIds[0];
        this.state.isConnected = true;
      }
      this.state.network = pairingData.network || 'testnet';
      this.notifyListeners();
    });

    // Listen for connection status changes
    this.hashconnect.connectionStatusChangeEvent.on((connectionStatus) => {
      console.log('Connection status changed:', connectionStatus);

      // Update connection state based on HashConnect v3 enum
      this.state.isConnected = connectionStatus === HashConnectConnectionState.Connected ||
                               connectionStatus === HashConnectConnectionState.Paired;

      if (!this.state.isConnected) {
        this.state.accountId = null;
        this.pairingData = null;
      }

      this.notifyListeners();
    });

    // Listen for disconnection events
    this.hashconnect.disconnectionEvent.on((data) => {
      console.log('Disconnection event:', data);
      this.state.isConnected = false;
      this.state.accountId = null;
      this.pairingData = null;
      this.notifyListeners();
    });
  }

  async initializeConnection(): Promise<void> {
    try {
      // Prevent multiple initializations
      if (this.isInitialized) {
        console.log('HashConnect already initialized, skipping...');
        return;
      }

      console.log('Initializing HashConnect...');

      // Setup event listeners before initialization
      this.setupEventListeners();

      // Initialize HashConnect (v3 takes no parameters)
      await this.hashconnect.init();

      this.isInitialized = true;
      console.log('HashConnect initialized successfully');

      // Check for existing sessions after initialization
      await this.checkForExistingSessions();
    } catch (error) {
      console.error('Failed to initialize HashConnect:', error);
      throw error;
    }
  }

  private async checkForExistingSessions(): Promise<void> {
    try {
      console.log('Checking for existing sessions...');

      // In HashConnect v3, check if there are any existing sessions
      // Try multiple approaches to get session data

      // Approach 1: Check for getSessions method
      if (this.hashconnect && (this.hashconnect as any).getSessions) {
        const sessions = (this.hashconnect as any).getSessions();
        console.log('Found sessions via getSessions():', sessions);

        if (sessions && sessions.length > 0) {
          const session = sessions[0]; // Use the first available session
          console.log('Restoring session:', session);

          // Update state with session information
          if (session.accountIds && session.accountIds.length > 0) {
            this.state.accountId = session.accountIds[0];
            this.state.isConnected = true;
            this.state.network = session.network || 'testnet';
            this.pairingData = session;

            console.log('Session restored successfully:', {
              accountId: this.state.accountId,
              network: this.state.network,
              isConnected: this.state.isConnected
            });

            // Notify listeners about the restored connection
            this.notifyListeners();
            return;
          }
        }
      }

      // Approach 2: Check for session data in other properties
      if (this.hashconnect && (this.hashconnect as any).sessionData) {
        const sessionData = (this.hashconnect as any).sessionData;
        console.log('Found session data:', sessionData);

        if (sessionData && sessionData.accountIds && sessionData.accountIds.length > 0) {
          this.state.accountId = sessionData.accountIds[0];
          this.state.isConnected = true;
          this.state.network = sessionData.network || 'testnet';
          this.pairingData = sessionData;

          console.log('Session restored from sessionData:', {
            accountId: this.state.accountId,
            network: this.state.network,
            isConnected: this.state.isConnected
          });

          this.notifyListeners();
          return;
        }
      }

      // Approach 3: Wait for automatic session restoration
      console.log('No immediate session data found, waiting for automatic restoration...');

      // Give HashConnect time to automatically restore sessions and fire events
      setTimeout(() => {
        console.log('Timeout check - current state:', this.getState());
        if (!this.state.isConnected) {
          console.log('No session was automatically restored');
        }
      }, 2000);

    } catch (error) {
      console.warn('Error checking for existing sessions:', error);
      // Don't throw here as this is not critical for initialization
    }
  }

  async connectWallet(): Promise<void> {
    try {
      console.log('Connecting to wallet...');

      // In v3, use openPairingModal to initiate connection
      // This will automatically detect and connect to HashPack extension if available
      this.hashconnect.openPairingModal();

      console.log('Wallet connection modal opened');
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      throw error;
    }
  }

  async disconnectWallet(): Promise<void> {
    try {
      console.log('Disconnecting wallet...');

      // In v3, use disconnect() without parameters
      this.hashconnect.disconnect();

      // Reset state
      this.state = {
        isConnected: false,
        accountId: null,
        network: 'testnet',
        topic: '',
        pairingString: ''
      };
      this.pairingData = null;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  async signTransaction(transaction: any): Promise<any> {
    try {
      if (!this.state.isConnected || !this.state.accountId) {
        throw new Error('Wallet not connected');
      }

      console.log('Preparing transaction for signing...');
      console.log('Transaction type:', transaction.constructor.name);
      console.log('Transaction frozen status:', transaction.isFrozen());

      const userAccountId = AccountId.fromString(this.state.accountId);

      // HashConnect will handle transaction preparation, so we don't modify it
      console.log('Transaction details:', {
        isFrozen: transaction.isFrozen(),
        hasTransactionId: !!transaction.transactionId,
        hasNodeAccountIds: !!transaction.nodeAccountIds && transaction.nodeAccountIds.length > 0,
        accountId: this.state.accountId
      });

      console.log('Sending transaction to HashConnect for signing...');

      try {
        // Use HashConnect v3 API
        const result = await this.hashconnect.sendTransaction(userAccountId, transaction);

        console.log('Transaction result from HashConnect:', result);
        console.log('Result type:', typeof result);
        console.log('Result keys:', result ? Object.keys(result) : 'null');
        console.log('Transaction executed successfully');

        // Return the transaction ID as string
        const txId = transaction.transactionId?.toString() || 'unknown';
        console.log('Returning transaction ID:', txId);
        return txId;

      } catch (hashConnectError) {
        console.error('HashConnect sendTransaction error:', hashConnectError);
        console.error('Error type:', typeof hashConnectError);
        console.error('Error keys:', Object.keys(hashConnectError));

        // Get error message safely
        let errorMessage = 'Unknown error';
        if (hashConnectError && typeof hashConnectError === 'object') {
          if (typeof hashConnectError.message === 'string') {
            errorMessage = hashConnectError.message;
          } else if (hashConnectError.toString) {
            errorMessage = hashConnectError.toString();
          } else {
            errorMessage = JSON.stringify(hashConnectError);
          }
        }

        console.error('Extracted error message:', errorMessage);

        // Check for specific error types
        if (errorMessage.toLowerCase().includes('user rejected') ||
            errorMessage.toLowerCase().includes('rejected')) {
          throw new Error('Transaction was rejected by user');
        } else if (errorMessage.toLowerCase().includes('insufficient')) {
          throw new Error('Insufficient HBAR balance for transaction fees');
        } else {
          throw new Error(`HashConnect error: ${errorMessage}`);
        }
      }

    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  getState(): HashPackConnectionState {
    return { ...this.state };
  }

  isWalletConnected(): boolean {
    return this.state.isConnected && !!this.state.accountId;
  }

  getAccountId(): string | null {
    return this.state.accountId;
  }

  getNetwork(): string {
    return this.state.network;
  }

  getPairingString(): string {
    return this.state.pairingString;
  }

  addListener(listener: (state: HashPackConnectionState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: HashPackConnectionState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Placeholder for message signing (not commonly used in Hedera)
  async signMessage(_message: string): Promise<string> {
    throw new Error('Message signing not implemented for HashConnect');
  }

  // Static method to get or create singleton instance
  private static instance: HashConnectService | null = null;

  static getInstance(): HashConnectService {
    if (!HashConnectService.instance) {
      HashConnectService.instance = new HashConnectService();
    }
    return HashConnectService.instance;
  }
}

// Export singleton instance
export const hashConnectService = HashConnectService.getInstance();
