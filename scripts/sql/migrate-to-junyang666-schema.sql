-- ============================================
-- 遷移到 junyang666 Schema（建表 + 複製資料 + RLS + 視圖）
-- ============================================
-- 執行前：
--   1. 建議先備份資料。
--   2. 若 public.properties 尚未有 is_external、decoration_level 欄位，
--      請先執行 add-is-external-column.sql、add-decoration-level-column.sql。
-- 執行後：請將 supabase-config.js 的 db.schema 改為 'junyang666'。
-- ============================================

-- 1. Schema 與權限
CREATE SCHEMA IF NOT EXISTS junyang666;
GRANT USAGE ON SCHEMA junyang666 TO anon;
GRANT USAGE ON SCHEMA junyang666 TO authenticated;

-- ============================================
-- 2. junyang666.properties
-- ============================================
CREATE TABLE IF NOT EXISTS junyang666.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    city TEXT,
    district TEXT,
    address TEXT NOT NULL,
    address_detail TEXT,
    price TEXT NOT NULL,
    layout TEXT NOT NULL,
    total_area TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    is_external BOOLEAN DEFAULT false NOT NULL,
    status TEXT,
    status_text TEXT,
    community TEXT,
    main_area TEXT,
    auxiliary_area TEXT,
    common_area TEXT,
    land_area TEXT,
    parking_area TEXT,
    age TEXT,
    floor TEXT,
    building_type TEXT,
    orientation TEXT,
    management_fee TEXT,
    parking_type TEXT,
    parking_space TEXT,
    current_status TEXT,
    description TEXT,
    google_maps TEXT,
    tiktok_video_id TEXT,
    tiktok_username TEXT,
    reference_link TEXT,
    hide_address_number BOOLEAN DEFAULT false,
    decoration_level TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    transportation JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_junyang666_properties_number ON junyang666.properties(number);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_is_published ON junyang666.properties(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_type ON junyang666.properties(type);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_created_at ON junyang666.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_updated_at ON junyang666.properties(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_published_type ON junyang666.properties(is_published, type) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_published_created ON junyang666.properties(is_published, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_images ON junyang666.properties USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_transportation ON junyang666.properties USING GIN (transportation);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_features ON junyang666.properties USING GIN (features);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_is_external ON junyang666.properties(is_external);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_external_published ON junyang666.properties(is_external, is_published);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_external_type ON junyang666.properties(is_external, type);
CREATE INDEX IF NOT EXISTS idx_junyang666_properties_external_created ON junyang666.properties(is_external, created_at DESC);

-- 觸發器（使用 public 的函數）
DROP TRIGGER IF EXISTS update_junyang666_properties_updated_at ON junyang666.properties;
CREATE TRIGGER update_junyang666_properties_updated_at
    BEFORE UPDATE ON junyang666.properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE junyang666.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "任何人都可以讀取已上架的物件" ON junyang666.properties;
DROP POLICY IF EXISTS "任何人都可以讀取所有物件（後台）" ON junyang666.properties;
DROP POLICY IF EXISTS "任何人都可以插入物件" ON junyang666.properties;
DROP POLICY IF EXISTS "任何人都可以更新物件" ON junyang666.properties;
DROP POLICY IF EXISTS "任何人都可以刪除物件" ON junyang666.properties;
CREATE POLICY "任何人都可以讀取已上架的物件" ON junyang666.properties FOR SELECT USING (is_published = true);
CREATE POLICY "任何人都可以讀取所有物件（後台）" ON junyang666.properties FOR SELECT USING (true);
CREATE POLICY "任何人都可以插入物件" ON junyang666.properties FOR INSERT WITH CHECK (true);
CREATE POLICY "任何人都可以更新物件" ON junyang666.properties FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "任何人都可以刪除物件" ON junyang666.properties FOR DELETE USING (true);

-- ============================================
-- 3. junyang666.related_links
-- ============================================
CREATE TABLE IF NOT EXISTS junyang666.related_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    color_gradient TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    link_type TEXT DEFAULT 'button',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_junyang666_related_links_display_order ON junyang666.related_links(display_order);
CREATE INDEX IF NOT EXISTS idx_junyang666_related_links_is_active ON junyang666.related_links(is_active);
DROP TRIGGER IF EXISTS update_junyang666_related_links_updated_at ON junyang666.related_links;
CREATE TRIGGER update_junyang666_related_links_updated_at
    BEFORE UPDATE ON junyang666.related_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE junyang666.related_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許讀取 related_links" ON junyang666.related_links;
DROP POLICY IF EXISTS "允許寫入 related_links" ON junyang666.related_links;
CREATE POLICY "允許讀取 related_links" ON junyang666.related_links FOR SELECT USING (true);
CREATE POLICY "允許寫入 related_links" ON junyang666.related_links FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. junyang666.related_link_items
-- ============================================
CREATE TABLE IF NOT EXISTS junyang666.related_link_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_link_id UUID REFERENCES junyang666.related_links(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_junyang666_related_link_items_parent ON junyang666.related_link_items(parent_link_id);
CREATE INDEX IF NOT EXISTS idx_junyang666_related_link_items_display_order ON junyang666.related_link_items(display_order);
DROP TRIGGER IF EXISTS update_junyang666_related_link_items_updated_at ON junyang666.related_link_items;
CREATE TRIGGER update_junyang666_related_link_items_updated_at
    BEFORE UPDATE ON junyang666.related_link_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE junyang666.related_link_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許讀取 related_link_items" ON junyang666.related_link_items;
DROP POLICY IF EXISTS "允許寫入 related_link_items" ON junyang666.related_link_items;
CREATE POLICY "允許讀取 related_link_items" ON junyang666.related_link_items FOR SELECT USING (true);
CREATE POLICY "允許寫入 related_link_items" ON junyang666.related_link_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. 視圖（junyang666）
-- ============================================
DROP VIEW IF EXISTS junyang666.published_properties;
CREATE VIEW junyang666.published_properties AS
SELECT id, number, title, type, city, district, address, address_detail, price, layout, total_area,
       is_published, is_external, status, status_text, community, main_area, auxiliary_area, common_area,
       land_area, parking_area, age, floor, building_type, orientation, management_fee, parking_type,
       parking_space, current_status, description, google_maps, tiktok_video_id, tiktok_username,
       reference_link, hide_address_number, images, transportation, features, created_at, updated_at
FROM junyang666.properties
WHERE is_published = true AND is_external = false
ORDER BY created_at DESC;

DROP VIEW IF EXISTS junyang666.property_stats;
CREATE VIEW junyang666.property_stats AS
SELECT
    COUNT(*)::bigint AS total_properties,
    COUNT(*) FILTER (WHERE is_published = true)::bigint AS published_count,
    COUNT(*) FILTER (WHERE is_published = false)::bigint AS unpublished_count,
    COUNT(*) FILTER (WHERE is_external = false)::bigint AS internal_count,
    COUNT(*) FILTER (WHERE is_external = true)::bigint AS external_count,
    COUNT(*) FILTER (WHERE type = '套房')::bigint AS type_suite_count,
    COUNT(*) FILTER (WHERE type = '2房')::bigint AS type_2_count,
    COUNT(*) FILTER (WHERE type = '3房')::bigint AS type_3_count,
    COUNT(*) FILTER (WHERE type = '4房')::bigint AS type_4_count,
    COUNT(*) FILTER (WHERE status = 'new')::bigint AS new_count,
    COUNT(*) FILTER (WHERE status = 'sold')::bigint AS sold_count,
    COUNT(*) FILTER (WHERE status = 'urgent')::bigint AS urgent_count
FROM junyang666.properties;

-- ============================================
-- 6. 輔助函數（junyang666 schema，操作 junyang666.properties）
-- ============================================
CREATE OR REPLACE FUNCTION junyang666.check_property_number_exists(p_number TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_exclude_id IS NULL THEN
        RETURN EXISTS (SELECT 1 FROM junyang666.properties WHERE number = p_number);
    ELSE
        RETURN EXISTS (SELECT 1 FROM junyang666.properties WHERE number = p_number AND id != p_exclude_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = junyang666;

CREATE OR REPLACE FUNCTION junyang666.get_next_property_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_max_seq INTEGER;
    v_new_number TEXT;
BEGIN
    CASE p_type
        WHEN '套房' THEN v_prefix := 'S';
        WHEN '2房' THEN v_prefix := 'A';
        WHEN '3房' THEN v_prefix := 'B';
        WHEN '4房' THEN v_prefix := 'C';
        ELSE v_prefix := 'X';
    END CASE;
    SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM LENGTH(v_prefix) + 2) AS INTEGER)), 0) INTO v_max_seq
    FROM junyang666.properties
    WHERE number LIKE v_prefix || '-%' AND number ~ ('^' || v_prefix || '-\d+$');
    v_new_number := v_prefix || '-' || LPAD((v_max_seq + 1)::TEXT, 4, '0');
    RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = junyang666;

-- ============================================
-- 7. 從 public 複製資料（順序：related_links → related_link_items → properties）
-- ============================================
INSERT INTO junyang666.related_links (id, title, url, icon, color_gradient, display_order, is_active, link_type, created_at, updated_at)
SELECT id, title, url, icon, color_gradient, display_order, is_active, link_type, created_at, updated_at
FROM public.related_links
ON CONFLICT (id) DO NOTHING;

INSERT INTO junyang666.related_link_items (id, parent_link_id, title, url, display_order, is_active, created_at, updated_at)
SELECT id, parent_link_id, title, url, display_order, is_active, created_at, updated_at
FROM public.related_link_items
ON CONFLICT (id) DO NOTHING;

-- 複製時不從 public 讀取 decoration_level（該欄可能尚未存在），改為寫入 NULL
INSERT INTO junyang666.properties (
    id, number, title, type, city, district, address, address_detail, price, layout, total_area,
    is_published, is_external, status, status_text, community, main_area, auxiliary_area, common_area,
    land_area, parking_area, age, floor, building_type, orientation, management_fee, parking_type,
    parking_space, current_status, description, google_maps, tiktok_video_id, tiktok_username, reference_link,
    hide_address_number, decoration_level, images, transportation, features, created_at, updated_at
)
SELECT
    id, number, title, type, city, district, address, address_detail, price, layout, total_area,
    COALESCE(is_published, true), COALESCE(is_external, false), status, status_text, community, main_area,
    auxiliary_area, common_area, land_area, parking_area, age, floor, building_type, orientation, management_fee,
    parking_type, parking_space, current_status, description, google_maps, tiktok_video_id, tiktok_username,
    reference_link, COALESCE(hide_address_number, false), NULL::TEXT,
    images, transportation, features,
    created_at, updated_at
FROM public.properties
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. 授予表與視圖權限
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON junyang666.properties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON junyang666.related_links TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON junyang666.related_link_items TO anon, authenticated;
GRANT SELECT ON junyang666.published_properties TO anon, authenticated;
GRANT SELECT ON junyang666.property_stats TO anon, authenticated;

-- ============================================
-- 完成
-- ============================================
-- 請將 supabase-config.js 的 defaultOptions.db.schema 改為 'junyang666'
-- ============================================
