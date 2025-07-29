-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tokens table
CREATE TABLE IF NOT EXISTS public.tokens (
    id BIGSERIAL PRIMARY KEY,
    token_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    total_supply TEXT NOT NULL DEFAULT '0',
    treasury_account TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create NFTs table
CREATE TABLE IF NOT EXISTS public.nfts (
    id BIGSERIAL PRIMARY KEY,
    token_id TEXT NOT NULL,
    serial_number INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    metadata_url TEXT,
    metadata_content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_id, serial_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nfts_token_id ON public.nfts(token_id);
CREATE INDEX IF NOT EXISTS idx_nfts_account_id ON public.nfts(account_id);
CREATE INDEX IF NOT EXISTS idx_nfts_serial_number ON public.nfts(serial_number);
CREATE INDEX IF NOT EXISTS idx_nfts_token_serial ON public.nfts(token_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_tokens_token_id ON public.tokens(token_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_tokens_updated_at
    BEFORE UPDATE ON public.tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_nfts_updated_at
    BEFORE UPDATE ON public.nfts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tokens table
-- Allow read access to all users
CREATE POLICY "Allow read access to tokens" ON public.tokens
    FOR SELECT USING (true);

-- Allow insert/update for authenticated users (for admin operations)
CREATE POLICY "Allow insert tokens for authenticated users" ON public.tokens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update tokens for authenticated users" ON public.tokens
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for NFTs table
-- Allow read access to all users
CREATE POLICY "Allow read access to nfts" ON public.nfts
    FOR SELECT USING (true);

-- Allow insert/update for authenticated users (for admin operations)
CREATE POLICY "Allow insert nfts for authenticated users" ON public.nfts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update nfts for authenticated users" ON public.nfts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create a function to get NFT collection stats
CREATE OR REPLACE FUNCTION public.get_collection_stats(p_token_id TEXT)
RETURNS TABLE (
    token_id TEXT,
    total_nfts BIGINT,
    unique_owners BIGINT,
    last_minted TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_token_id,
        COUNT(*) as total_nfts,
        COUNT(DISTINCT account_id) as unique_owners,
        MAX(created_at) as last_minted
    FROM public.nfts 
    WHERE nfts.token_id = p_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get NFTs by owner
CREATE OR REPLACE FUNCTION public.get_nfts_by_owner(p_token_id TEXT, p_account_id TEXT)
RETURNS TABLE (
    id BIGINT,
    token_id TEXT,
    serial_number INTEGER,
    account_id TEXT,
    metadata_url TEXT,
    metadata_content JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nfts.id,
        nfts.token_id,
        nfts.serial_number,
        nfts.account_id,
        nfts.metadata_url,
        nfts.metadata_content,
        nfts.created_at,
        nfts.updated_at
    FROM public.nfts 
    WHERE nfts.token_id = p_token_id 
    AND nfts.account_id = p_account_id
    ORDER BY nfts.serial_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tokens TO anon, authenticated;
GRANT SELECT ON public.nfts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.tokens TO authenticated;
GRANT INSERT, UPDATE ON public.nfts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_collection_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nfts_by_owner(TEXT, TEXT) TO anon, authenticated;
