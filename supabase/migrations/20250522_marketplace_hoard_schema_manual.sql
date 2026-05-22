-- Marketplace and Hoard Database Schema
-- Manual SQL for Supabase SQL Editor
-- Note: novels and manga tables already exist in the database

-- Drop existing tables if they exist
DROP TABLE IF EXISTS marketplace_listings CASCADE;
DROP TABLE IF EXISTS hoard_items CASCADE;

-- Drop existing trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Hoard items table - stores user's collected/completed novels and manga
CREATE TABLE hoard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(10) NOT NULL, -- 'novel' or 'manga'
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    manga_id UUID REFERENCES manga(id) ON DELETE CASCADE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'hoarded', -- hoarded, listed, sold
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (content_type IN ('novel', 'manga')),
    CHECK (
        (content_type = 'novel' AND novel_id IS NOT NULL AND manga_id IS NULL) OR
        (content_type = 'manga' AND manga_id IS NOT NULL AND novel_id IS NULL)
    ),
    CHECK (status IN ('hoarded', 'listed', 'sold')),
    UNIQUE(user_id, content_type, novel_id),
    UNIQUE(user_id, content_type, manga_id)
);

-- Marketplace listings table - stores items listed for sale
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hoard_item_id UUID REFERENCES hoard_items(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SMP', -- SMP, USD, etc.
    description TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, sold, cancelled, expired
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (price >= 0),
    CHECK (currency IN ('SMP', 'USD')),
    CHECK (status IN ('active', 'sold', 'cancelled', 'expired'))
);

-- Indexes for performance
CREATE INDEX idx_hoard_items_user_id ON hoard_items(user_id);
CREATE INDEX idx_hoard_items_content_type ON hoard_items(content_type);
CREATE INDEX idx_hoard_items_novel_id ON hoard_items(novel_id);
CREATE INDEX idx_hoard_items_manga_id ON hoard_items(manga_id);
CREATE INDEX idx_hoard_items_status ON hoard_items(status);
CREATE INDEX idx_hoard_items_added_at ON hoard_items(added_at);

CREATE INDEX idx_marketplace_listings_hoard_item ON marketplace_listings(hoard_item_id);
CREATE INDEX idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_listed_at ON marketplace_listings(listed_at);
CREATE INDEX idx_marketplace_listings_price ON marketplace_listings(price);

-- RLS Policies
ALTER TABLE hoard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS for testing
ALTER TABLE hoard_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;

-- Hoard items - users can only see their own hoard
CREATE POLICY "Users can view own hoard items" ON hoard_items
    FOR SELECT USING (auth.uid() = user_id);

-- Hoard items - users can insert their own hoard items
CREATE POLICY "Users can insert own hoard items" ON hoard_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Hoard items - users can update their own hoard items
CREATE POLICY "Users can update own hoard items" ON hoard_items
    FOR UPDATE USING (auth.uid() = user_id);

-- Hoard items - users can delete their own hoard items
CREATE POLICY "Users can delete own hoard items" ON hoard_items
    FOR DELETE USING (auth.uid() = user_id);

-- Marketplace listings - anyone can view active listings
CREATE POLICY "Anyone can view active marketplace listings" ON marketplace_listings
    FOR SELECT USING (status = 'active');

-- Marketplace listings - sellers can view their own listings
CREATE POLICY "Sellers can view own marketplace listings" ON marketplace_listings
    FOR SELECT USING (auth.uid() = seller_id);

-- Marketplace listings - users can create listings for their own hoard items
CREATE POLICY "Users can create listings for own hoard items" ON marketplace_listings
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Marketplace listings - sellers can update their own listings
CREATE POLICY "Sellers can update own marketplace listings" ON marketplace_listings
    FOR UPDATE USING (auth.uid() = seller_id);

-- Marketplace listings - sellers can delete their own listings
CREATE POLICY "Sellers can delete own marketplace listings" ON marketplace_listings
    FOR DELETE USING (auth.uid() = seller_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hoard_items table
CREATE TRIGGER trigger_hoard_items_updated_at
    BEFORE UPDATE ON hoard_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE hoard_items IS 'User hoard - collected/completed novels';
COMMENT ON TABLE marketplace_listings IS 'Marketplace listings for selling hoard items';
