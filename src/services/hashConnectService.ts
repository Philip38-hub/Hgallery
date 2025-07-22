import { AccountId, LedgerId, Transaction, TransactionId } from '@hashgraph/sdk';
import { DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId, transactionToBase64String } from "@hashgraph/hedera-wallet-connect";
import { SignClientTypes } from "@walletconnect/types";
import EventEmitter from "events";

export interface HashPackConnectionState {
  isConnected: boolean;
  accountId: string | null;
  network: string;
  topic: string; // This might not be directly used with DAppConnector, but keeping for compatibility
  pairingString: string; // This might not be directly used with DAppConnector, but keeping for compatibility
}

// Create a new project in walletconnect cloud to generate a project id
// You will need to replace this with your own project ID from WalletConnect Cloud
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID";

// Created refreshEvent because `dappConnector.walletConnectClient.on(eventName, syncWithWalletConnectContext)` would not call syncWithWalletConnectContext
const refreshEvent = new EventEmitter();

export class HashConnectService {
  private dappConnector: DAppConnector;
  private appMetadata: SignClientTypes.Metadata;
  private state: HashPackConnectionState;
  private listeners: ((state: HashPackConnectionState) => void)[] = [];

  constructor() {
    this.appMetadata = {
      name: import.meta.env.VITE_HASHCONNECT_APP_NAME || 'Hedera Gallery',
      description: import.meta.env.VITE_HASHCONNECT_APP_DESCRIPTION || 'Decentralized Media NFT Gallery',
      url: window.location.origin,
      icons: [import.meta.env.VITE_HASHCONNECT_ICON_URL || '/favicon.ico'],
    };

    this.dappConnector = new DAppConnector(
      this.appMetadata,
      LedgerId.TESTNET, // Assuming testnet for now, can be dynamic
      WALLETCONNECT_PROJECT_ID,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet], // Assuming testnet for now, can be dynamic
    );

    this.state = {
      isConnected: false,
      accountId: null,
      network: 'testnet',
      topic: '',
      pairingString: ''
    };

    this.initializeDAppConnector();
  }

  private async initializeDAppConnector() {
    try {
      await this.dappConnector.init();

      // Set up event listeners
      // Removed problematic event listeners for AccountsChanged and ChainChanged
      // as they cause type errors and state syncing is handled by syncWithDAppConnectorContext
      // called after init, openModal, and disconnectAll.
      this.dappConnector.walletConnectClient.on("session_delete", () => {
        console.log('Session deleted event');
        this.syncWithDAppConnectorContext();
      });

      // Initial sync
      this.syncWithDAppConnectorContext();

    } catch (error) {
      console.error('Error initializing DAppConnector:', error);
    }
  }

  private syncWithDAppConnectorContext() {
    const accountId = this.dappConnector.signers[0]?.getAccountId()?.toString();
    // Network is assumed to be the one set during DAppConnector initialization
    // or updated via specific events if they are correctly handled.

    if (accountId) {
      this.state.isConnected = true;
      this.state.accountId = accountId;
      // this.state.network remains as initialized or updated by other means
    } else {
      this.state.isConnected = false;
      this.state.accountId = null;
      this.state.network = 'testnet'; // Default to testnet if disconnected
    }
    this.notifyListeners();
  }

  async connectWallet(): Promise<void> {
    try {
      if (this.state.isConnected) {
        return;
      }

      await this.dappConnector.openModal();
      this.syncWithDAppConnectorContext(); // Sync after modal closes
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect to WalletConnect wallet');
    }
  }

  async disconnectWallet(): Promise<void> {
    try {
      await this.dappConnector.disconnectAll();
      this.syncWithDAppConnectorContext(); // Sync after disconnection
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  async signTransaction(transaction: Transaction): Promise<TransactionId | null> {
    try {
      if (!this.state.isConnected || !this.state.accountId) {
        throw new Error('Wallet not connected');
      }

      const signer = this.dappConnector.signers[0];
      if (!signer) {
        throw new Error('No signer available');
      }

      await transaction.freezeWithSigner(signer); // Use freezeWithSigner
      const txResult = await transaction.executeWithSigner(signer);

      return txResult ? txResult.transactionId : null;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    // DAppConnector does not have a direct 'sign message' method like HashConnect v1.
    // Message signing might need to be implemented using a custom RPC method or
    // by leveraging the underlying WalletConnect client if supported.
    // For now, throwing an error as it's not directly available in the template's DAppConnector usage.
    throw new Error('Message signing is not directly supported by DAppConnector in this implementation.');
  }

  getState(): HashPackConnectionState {
    return { ...this.state };
  }

  getPairingString(): string {
    // Pairing string is not directly exposed in DAppConnector in the same way as HashConnect v1
    // The modal handles the pairing.
    return "Pairing handled by WalletConnect modal.";
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

  public getEthersProvider(): any { // Use 'any' for now to avoid strict type issues with WalletConnect's provider
    return this.dappConnector;
  }
}

export const hashConnectService = new HashConnectService();