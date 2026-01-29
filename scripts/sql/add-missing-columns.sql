-- ============================================
-- 新增缺少的欄位到 properties 資料表
-- ============================================
-- 如果遷移時出現 "Could not find the 'address_detail' column" 錯誤
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案
-- ============================================

-- 新增 address_detail 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'address_detail'
    ) THEN
        ALTER TABLE properties ADD COLUMN address_detail TEXT;
        RAISE NOTICE '已新增 address_detail 欄位';
    ELSE
        RAISE NOTICE 'address_detail 欄位已存在';
    END IF;
END $$;

-- 新增 city 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'city'
    ) THEN
        ALTER TABLE properties ADD COLUMN city TEXT;
        RAISE NOTICE '已新增 city 欄位';
    ELSE
        RAISE NOTICE 'city 欄位已存在';
    END IF;
END $$;

-- 新增 district 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'district'
    ) THEN
        ALTER TABLE properties ADD COLUMN district TEXT;
        RAISE NOTICE '已新增 district 欄位';
    ELSE
        RAISE NOTICE 'district 欄位已存在';
    END IF;
END $$;

-- 檢查結果
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
AND column_name IN ('address_detail', 'city', 'district')
ORDER BY column_name;
