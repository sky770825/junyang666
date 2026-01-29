-- ============================================
-- Supabase 物件管理系統 - 完整 SQL 設定腳本
-- ============================================
-- 執行順序：按照此文件的順序執行所有 SQL 語句
-- ============================================

-- ============================================
-- 1. 建立 properties 資料表
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
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
    images JSONB DEFAULT '[]'::jsonb,
    transportation JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果資料表已存在，新增欄位（用於更新現有資料表）
DO $$ 
BEGIN
    -- 新增 city 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'properties' AND column_name = 'city') THEN
        ALTER TABLE properties ADD COLUMN city TEXT;
    END IF;
    
    -- 新增 district 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'properties' AND column_name = 'district') THEN
        ALTER TABLE properties ADD COLUMN district TEXT;
    END IF;
    
    -- 新增 address_detail 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'properties' AND column_name = 'address_detail') THEN
        ALTER TABLE properties ADD COLUMN address_detail TEXT;
    END IF;
END $$;

-- ============================================
-- 2. 建立索引（提升查詢效能）
-- ============================================

-- 物件編號索引（唯一性檢查）
CREATE INDEX IF NOT EXISTS idx_properties_number ON properties(number);

-- 上架狀態索引（前台查詢用）
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published) WHERE is_published = true;

-- 房型索引（篩選用）
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);

-- 建立時間索引（排序用）
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- 更新時間索引（排序用）
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at DESC);

-- 複合索引：上架狀態 + 房型（常用查詢組合）
CREATE INDEX IF NOT EXISTS idx_properties_published_type ON properties(is_published, type) WHERE is_published = true;

-- 複合索引：上架狀態 + 建立時間（前台列表查詢）
CREATE INDEX IF NOT EXISTS idx_properties_published_created ON properties(is_published, created_at DESC) WHERE is_published = true;

-- JSONB 欄位索引（用於 JSON 查詢）
CREATE INDEX IF NOT EXISTS idx_properties_images ON properties USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_properties_transportation ON properties USING GIN (transportation);
CREATE INDEX IF NOT EXISTS idx_properties_features ON properties USING GIN (features);

-- ============================================
-- 3. 建立更新時間自動更新函數
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 建立觸發器：自動更新 updated_at
-- 先刪除已存在的觸發器（如果有的話）
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. 啟用 Row Level Security (RLS)
-- ============================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. 建立 RLS 政策
-- ============================================

-- 先刪除已存在的政策（如果有的話），避免重複執行時出錯
DROP POLICY IF EXISTS "任何人都可以讀取已上架的物件" ON properties;
DROP POLICY IF EXISTS "任何人都可以讀取所有物件（後台）" ON properties;
DROP POLICY IF EXISTS "任何人都可以插入物件" ON properties;
DROP POLICY IF EXISTS "任何人都可以更新物件" ON properties;
DROP POLICY IF EXISTS "任何人都可以刪除物件" ON properties;

-- 政策 1：任何人都可以讀取已上架的物件（前台顯示用）
CREATE POLICY "任何人都可以讀取已上架的物件"
    ON properties FOR SELECT
    USING (is_published = true);

-- 政策 2：任何人都可以讀取所有物件（後台管理用）
-- ⚠️ 注意：在生產環境中，建議使用認證來限制這個政策
CREATE POLICY "任何人都可以讀取所有物件（後台）"
    ON properties FOR SELECT
    USING (true);

-- 政策 3：允許插入新物件
-- ⚠️ 注意：在生產環境中，建議使用認證來限制這個政策
CREATE POLICY "任何人都可以插入物件"
    ON properties FOR INSERT
    WITH CHECK (true);

-- 政策 4：允許更新物件
-- ⚠️ 注意：在生產環境中，建議使用認證來限制這個政策
CREATE POLICY "任何人都可以更新物件"
    ON properties FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 政策 5：允許刪除物件
-- ⚠️ 注意：在生產環境中，建議使用認證來限制這個政策
CREATE POLICY "任何人都可以刪除物件"
    ON properties FOR DELETE
    USING (true);

-- ============================================
-- 6. 建立視圖（方便查詢）
-- ============================================

-- 視圖 1：只顯示已上架的物件（前台用）
CREATE OR REPLACE VIEW published_properties AS
SELECT 
    id,
    number,
    title,
    type,
    city,
    district,
    address,
    address_detail,
    price,
    layout,
    total_area,
    status,
    status_text,
    community,
    main_area,
    auxiliary_area,
    common_area,
    land_area,
    parking_area,
    age,
    floor,
    building_type,
    orientation,
    management_fee,
    parking_type,
    parking_space,
    current_status,
    description,
    google_maps,
    tiktok_video_id,
    tiktok_username,
    reference_link,
    hide_address_number,
    images,
    transportation,
    features,
    created_at,
    updated_at
FROM properties
WHERE is_published = true
ORDER BY created_at DESC;

-- 視圖 2：物件統計（用於後台儀表板）
CREATE OR REPLACE VIEW property_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE is_published = true) as published_count,
    COUNT(*) FILTER (WHERE is_published = false) as unpublished_count,
    COUNT(*) FILTER (WHERE type = '套房') as type_suite_count,
    COUNT(*) FILTER (WHERE type = '2房') as type_2_count,
    COUNT(*) FILTER (WHERE type = '3房') as type_3_count,
    COUNT(*) FILTER (WHERE type = '4房') as type_4_count,
    COUNT(*) FILTER (WHERE status = 'new') as new_count,
    COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
    COUNT(*) FILTER (WHERE status = 'urgent') as urgent_count
FROM properties;

-- ============================================
-- 7. 建立輔助函數
-- ============================================

-- 函數 1：檢查物件編號是否重複
CREATE OR REPLACE FUNCTION check_property_number_exists(p_number TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_exclude_id IS NULL THEN
        RETURN EXISTS (SELECT 1 FROM properties WHERE number = p_number);
    ELSE
        RETURN EXISTS (SELECT 1 FROM properties WHERE number = p_number AND id != p_exclude_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 函數 2：取得下一個可用的物件編號
CREATE OR REPLACE FUNCTION get_next_property_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_max_seq INTEGER;
    v_new_number TEXT;
BEGIN
    -- 根據房型設定前綴
    CASE p_type
        WHEN '套房' THEN v_prefix := 'S';
        WHEN '2房' THEN v_prefix := 'A';
        WHEN '3房' THEN v_prefix := 'B';
        WHEN '4房' THEN v_prefix := 'C';
        ELSE v_prefix := 'X';
    END CASE;
    
    -- 找出該類型中最大的序號
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(number FROM LENGTH(v_prefix) + 2) AS INTEGER
        )
    ), 0) INTO v_max_seq
    FROM properties
    WHERE number LIKE v_prefix || '-%'
    AND number ~ ('^' || v_prefix || '-\d+$');
    
    -- 生成新編號
    v_new_number := v_prefix || '-' || LPAD((v_max_seq + 1)::TEXT, 4, '0');
    
    RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Storage Policies（需要在 Supabase Dashboard 的 Storage 設定中執行）
-- ============================================

-- 注意：以下 SQL 需要在 Supabase Dashboard → Storage → Policies 中執行
-- 或者使用 Supabase Dashboard 的 SQL Editor

-- 先刪除已存在的 Storage 政策（如果有的話），避免重複執行時出錯
DROP POLICY IF EXISTS "任何人都可以讀取圖片" ON storage.objects;
DROP POLICY IF EXISTS "任何人都可以上傳圖片" ON storage.objects;
DROP POLICY IF EXISTS "任何人都可以更新圖片" ON storage.objects;
DROP POLICY IF EXISTS "任何人都可以刪除圖片" ON storage.objects;

-- 政策 1：任何人都可以讀取 junyang666 bucket 中的圖片
CREATE POLICY "任何人都可以讀取圖片"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'junyang666');

-- 政策 2：任何人都可以上傳圖片到 junyang666 bucket
CREATE POLICY "任何人都可以上傳圖片"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'junyang666');

-- 政策 3：任何人都可以更新 junyang666 bucket 中的圖片
CREATE POLICY "任何人都可以更新圖片"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'junyang666')
    WITH CHECK (bucket_id = 'junyang666');

-- 政策 4：任何人都可以刪除 junyang666 bucket 中的圖片
CREATE POLICY "任何人都可以刪除圖片"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'junyang666');

-- ============================================
-- 9. 建立測試資料（可選）
-- ============================================

-- 插入測試物件（僅供測試用，可刪除）
-- INSERT INTO properties (
--     number, title, type, address, price, layout, total_area,
--     is_published, status, description, images
-- ) VALUES (
--     'A-0001',
--     '測試物件 - 2房',
--     '2房',
--     '測試地址',
--     '500萬',
--     '2房2廳1衛',
--     '25坪',
--     true,
--     'new',
--     '這是一個測試物件',
--     '[]'::jsonb
-- );

-- ============================================
-- 10. 查詢範例
-- ============================================

-- 查詢所有已上架的物件
-- SELECT * FROM published_properties ORDER BY created_at DESC;

-- 查詢特定房型的已上架物件
-- SELECT * FROM published_properties WHERE type = '2房' ORDER BY created_at DESC;

-- 查詢物件統計
-- SELECT * FROM property_stats;

-- 檢查物件編號是否存在
-- SELECT check_property_number_exists('A-0001');

-- 取得下一個可用的物件編號
-- SELECT get_next_property_number('2房');

-- ============================================
-- 完成！
-- ============================================
-- 執行完以上 SQL 後，您的 Supabase 資料庫就設定完成了
-- 記得在 Supabase Dashboard 中建立 'junyang666' Storage Bucket
-- ============================================
