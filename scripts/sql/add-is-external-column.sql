-- ============================================
-- 新增「非本店物件」欄位到 properties 資料表
-- ============================================
-- 執行此 SQL 腳本以添加 is_external 欄位和相關索引
-- ============================================

-- ============================================
-- 1. 新增 is_external 欄位
-- ============================================
DO $$ 
BEGIN
    -- 檢查欄位是否已存在，如果不存在則新增
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'is_external'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE properties 
        ADD COLUMN is_external BOOLEAN DEFAULT FALSE NOT NULL;
        
        -- 添加欄位註解
        COMMENT ON COLUMN properties.is_external IS '是否為非本店物件（其他家房仲的物件）。TRUE=非本店物件，FALSE=本店物件（預設）';
        
        RAISE NOTICE '✅ 已成功新增 is_external 欄位';
    ELSE
        RAISE NOTICE '⚠️ is_external 欄位已存在，跳過新增';
    END IF;
END $$;

-- ============================================
-- 2. 更新現有資料（確保所有現有物件都是本店物件）
-- ============================================
UPDATE properties 
SET is_external = FALSE 
WHERE is_external IS NULL;

-- ============================================
-- 3. 建立索引（提升篩選效能）
-- ============================================

-- 索引 1：is_external 單一索引（用於篩選店內/店外物件）
CREATE INDEX IF NOT EXISTS idx_properties_is_external 
ON properties(is_external);

-- 索引 2：複合索引：is_external + is_published（常用查詢組合）
CREATE INDEX IF NOT EXISTS idx_properties_external_published 
ON properties(is_external, is_published);

-- 索引 3：複合索引：is_external + type（按來源和房型篩選）
CREATE INDEX IF NOT EXISTS idx_properties_external_type 
ON properties(is_external, type);

-- 索引 4：複合索引：is_external + created_at（按來源和時間排序）
CREATE INDEX IF NOT EXISTS idx_properties_external_created 
ON properties(is_external, created_at DESC);

-- ============================================
-- 4. 更新視圖（published_properties）
-- ============================================
-- 注意：此視圖只顯示已上架的本店物件（is_published = true AND is_external = false）
-- 先刪除現有視圖（避免欄位順序衝突）
DROP VIEW IF EXISTS published_properties;

CREATE VIEW published_properties AS
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
    is_external,
    images,
    transportation,
    features,
    created_at,
    updated_at
FROM properties
WHERE is_published = true 
  AND is_external = false  -- 只顯示本店物件
ORDER BY created_at DESC;

-- ============================================
-- 5. 更新統計視圖（property_stats）
-- ============================================
-- 先刪除現有視圖（避免欄位順序衝突）
DROP VIEW IF EXISTS property_stats;

CREATE VIEW property_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE is_published = true) as published_count,
    COUNT(*) FILTER (WHERE is_published = false) as unpublished_count,
    COUNT(*) FILTER (WHERE is_external = false) as internal_count,  -- 本店物件數
    COUNT(*) FILTER (WHERE is_external = true) as external_count,    -- 非本店物件數
    COUNT(*) FILTER (WHERE type = '套房') as type_suite_count,
    COUNT(*) FILTER (WHERE type = '2房') as type_2_count,
    COUNT(*) FILTER (WHERE type = '3房') as type_3_count,
    COUNT(*) FILTER (WHERE type = '4房') as type_4_count,
    COUNT(*) FILTER (WHERE status = 'new') as new_count,
    COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
    COUNT(*) FILTER (WHERE status = 'urgent') as urgent_count
FROM properties;

-- ============================================
-- 6. 驗證欄位是否成功新增
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name = 'is_external'
  AND table_schema = 'public';

-- ============================================
-- 完成！
-- ============================================
-- 執行完成後，properties 資料表已包含 is_external 欄位
-- 所有現有物件預設為 is_external = FALSE（本店物件）
-- ============================================
