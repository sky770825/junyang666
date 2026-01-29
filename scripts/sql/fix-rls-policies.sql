-- ============================================
-- 修復 RLS 政策（確保可以插入物件）
-- ============================================
-- 如果遷移時出現 "PGRST116" 或 "permission" 錯誤
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案
-- ============================================

-- 1. 確認 RLS 已啟用
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 2. 刪除可能存在的舊政策（避免衝突）
DROP POLICY IF EXISTS "任何人都可以插入物件" ON properties;
DROP POLICY IF EXISTS "允許任何人插入物件" ON properties;
DROP POLICY IF EXISTS "允許已認證用戶插入物件" ON properties;
DROP POLICY IF EXISTS "允許插入新物件" ON properties;

-- 3. 建立 INSERT 政策（允許任何人插入）
CREATE POLICY "任何人都可以插入物件"
    ON properties FOR INSERT
    TO public
    WITH CHECK (true);

-- 4. 確認其他政策存在
-- SELECT 政策
DROP POLICY IF EXISTS "任何人都可以讀取已上架的物件" ON properties;
CREATE POLICY "任何人都可以讀取已上架的物件"
    ON properties FOR SELECT
    TO public
    USING (is_published = true);

DROP POLICY IF EXISTS "任何人都可以讀取所有物件（後台）" ON properties;
CREATE POLICY "任何人都可以讀取所有物件（後台）"
    ON properties FOR SELECT
    TO public
    USING (true);

-- UPDATE 政策
DROP POLICY IF EXISTS "任何人都可以更新物件" ON properties;
CREATE POLICY "任何人都可以更新物件"
    ON properties FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- DELETE 政策
DROP POLICY IF EXISTS "任何人都可以刪除物件" ON properties;
CREATE POLICY "任何人都可以刪除物件"
    ON properties FOR DELETE
    TO public
    USING (true);

-- 5. 驗證政策
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'properties'
ORDER BY policyname;

-- 6. 測試插入（可選）
-- INSERT INTO properties (number, title, type, address, price, layout, total_area, is_published)
-- VALUES ('TEST-' || NOW()::TEXT, '測試物件', '2房', '測試地址', '1000萬', '2房2廳1衛', '30坪', false)
-- RETURNING id;
