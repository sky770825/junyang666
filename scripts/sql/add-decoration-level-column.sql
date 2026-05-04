-- ============================================
-- 新增 decoration_level 欄位（如果需要的話）
-- ============================================
-- 如果遷移時出現 "Could not find the 'decoration_level' column" 錯誤
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案
-- ============================================

-- 新增 decoration_level 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'decoration_level'
    ) THEN
        ALTER TABLE properties ADD COLUMN decoration_level TEXT;
        RAISE NOTICE '已新增 decoration_level 欄位';
    ELSE
        RAISE NOTICE 'decoration_level 欄位已存在';
    END IF;
END $$;

-- 檢查結果
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
AND column_name = 'decoration_level';
