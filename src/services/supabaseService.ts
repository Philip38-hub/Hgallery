import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface NFTRecord {
  id?: number;
  token_id: string;
  serial_number: number;
  account_id: string;
  metadata_url?: string;
  metadata_content?: any;
  created_at?: string;
  updated_at?: string;
}

export interface TokenRecord {
  id?: number;
  token_id: string;
  name: string;
  symbol: string;
  total_supply: string;
  treasury_account: string;
  created_at?: string;
  updated_at?: string;
}

class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not found, running in fallback mode');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      this.isInitialized = true;
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.warn('Failed to initialize Supabase client:', error);
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.supabase !== null;
  }

  // NFT Operations
  async createNFT(nft: Omit<NFTRecord, 'id' | 'created_at' | 'updated_at'>): Promise<NFTRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('nfts')
        .insert([nft])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating NFT record:', error);
      return null;
    }
  }

  async getNFT(tokenId: string, serialNumber: number): Promise<NFTRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('nfts')
        .select('*')
        .eq('token_id', tokenId)
        .eq('serial_number', serialNumber)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching NFT:', error);
      return null;
    }
  }

  async getNFTs(tokenId: string, limit = 50, offset = 0): Promise<NFTRecord[]> {
    if (!this.isAvailable()) return [];

    try {
      const { data, error } = await this.supabase!
        .from('nfts')
        .select('*')
        .eq('token_id', tokenId)
        .order('serial_number', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  }

  async updateNFT(tokenId: string, serialNumber: number, updates: Partial<NFTRecord>): Promise<NFTRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('nfts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('token_id', tokenId)
        .eq('serial_number', serialNumber)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating NFT:', error);
      return null;
    }
  }

  // Token Operations
  async createToken(token: Omit<TokenRecord, 'id' | 'created_at' | 'updated_at'>): Promise<TokenRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('tokens')
        .insert([token])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating token record:', error);
      return null;
    }
  }

  async getToken(tokenId: string): Promise<TokenRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('tokens')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  }

  async updateToken(tokenId: string, updates: Partial<TokenRecord>): Promise<TokenRecord | null> {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!
        .from('tokens')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('token_id', tokenId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating token:', error);
      return null;
    }
  }

  // Edge Function calls
  async callEdgeFunction(functionName: string, payload: any): Promise<any> {
    if (!this.isAvailable()) return null;

    try {
      console.log(`🔄 Calling edge function ${functionName} with payload:`, payload);

      const { data, error } = await this.supabase!.functions.invoke(functionName, {
        body: payload,
      });

      console.log(`📋 Edge function ${functionName} response:`, { data, error });

      if (error) {
        console.error(`❌ Edge function ${functionName} error:`, error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error(`❌ Error calling edge function ${functionName}:`, error);
      throw error; // Re-throw instead of returning null to preserve error information
    }
  }

  // Mint NFT via Edge Function
  async mintNFT(metadataUrl: string, userAccountId?: string): Promise<any> {
    return this.callEdgeFunction('hedera-nft-mint', {
      metadataUrl,
      userAccountId,
    });
  }

  // Get token info via Edge Function
  async getTokenInfo(tokenId: string): Promise<any> {
    return this.callEdgeFunction('hedera-mirror-nfts', {
      tokenId,
      includeNFTs: true,
      limit: 50,
      offset: 0,
    });
  }

  // Authentication helpers
  async signIn(email: string, password: string) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      return null;
    }
  }

  async signUp(email: string, password: string) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.supabase!.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      return null;
    }
  }

  async signOut() {
    if (!this.isAvailable()) return null;

    try {
      const { error } = await this.supabase!.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return null;
    }
  }

  async getCurrentUser() {
    if (!this.isAvailable()) return null;

    try {
      const { data: { user } } = await this.supabase!.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
