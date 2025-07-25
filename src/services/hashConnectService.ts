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
  private appMetadata = {
    name: import.meta.env.VITE_HASHCONNECT_APP_NAME || 'Hedera Gallery',
    description: import.meta.env.VITE_HASHCONNECT_APP_DESCRIPTION || 'Decentralized Media NFT Gallery',
    icons: [import.meta.env.VITE_HASHCONNECT_ICON_URL || '/favicon.ico'],
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
      console.log('Initializing HashConnect...');

      // Setup event listeners before initialization
      this.setupEventListeners();

      // Initialize HashConnect (v3 takes no parameters)
      await this.hashconnect.init();

      console.log('HashConnect initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HashConnect:', error);
      throw error;
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

  async signTransaction(transaction: Transaction): Promise<TransactionId | null> {
    try {
      if (!this.state.isConnected || !this.state.accountId) {
        throw new Error('Wallet not connected');
      }

      console.log('Preparing transaction for signing...');

      // Set the transaction ID and node account IDs
      transaction.setTransactionId(TransactionId.generate(this.state.accountId));
      transaction.setNodeAccountIds([new AccountId(3)]); // For testnet
      transaction.setTransactionMemo("Mint Hgallery NFT");

      // Freeze the transaction
      transaction.freeze();

      console.log('Transaction prepared:', {
        transactionId: transaction.transactionId?.toString(),
        nodeAccountIds: transaction.nodeAccountIds?.map(id => id.toString()),
        memo: transaction.transactionMemo
      });

      console.log('Signing transaction with HashConnect...');

      // Use HashConnect v3 API - sendTransaction takes AccountId and Transaction
      const accountId = AccountId.fromString(this.state.accountId);
      const result = await this.hashconnect.sendTransaction(accountId, transaction);

      console.log('Transaction signed and executed:', result);

      // The result should contain the transaction receipt
      // Return the original transaction ID since it was successfully executed
      return transaction.transactionId!;

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
