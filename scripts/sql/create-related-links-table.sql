-- 建立相關連結資料表
-- 用於儲存和管理網站相關連結

CREATE TABLE IF NOT EXISTS related_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT, -- emoji 圖示，例如：🏠、🎵、🧮
    color_gradient TEXT, -- CSS 漸層顏色，例如：linear-gradient(45deg, #2ecc71, #27ae60)
    display_order INTEGER DEFAULT 0, -- 顯示順序
    is_active BOOLEAN DEFAULT true, -- 是否啟用
    link_type TEXT DEFAULT 'button', -- 類型：button（按鈕）、dropdown（下拉選單）
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_related_links_display_order ON related_links(display_order);
CREATE INDEX IF NOT EXISTS idx_related_links_is_active ON related_links(is_active);

-- 建立更新時間的自動更新函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 建立觸發器
CREATE TRIGGER update_related_links_updated_at BEFORE UPDATE ON related_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設資料
INSERT INTO related_links (title, url, icon, color_gradient, display_order, is_active, link_type) VALUES
('更多物件資料', 'https://realtor.houseprice.tw/agent/buy/0928776755/', '🏠', 'linear-gradient(45deg, #2ecc71, #27ae60)', 1, true, 'button'),
('TikTok短影音', 'https://www.tiktok.com/@aihouse168', '🎵', 'linear-gradient(45deg, #000000, #333333)', 2, false, 'button'),
('房產比價試算', 'https://housepice.pages.dev/%E4%B8%89%E5%90%88%E4%B8%80%E6%88%BF%E5%83%B9%E6%99%AE%E7%89%B9%E7%B5%B2', '🧮', 'linear-gradient(45deg, #ff6b6b, #ee5a24)', 3, true, 'button'),
('預售團購區', 'https://salersteam.pages.dev/junyang', '🏢', 'linear-gradient(45deg, #9b59b6, #8e44ad)', 4, false, 'button'),
('楊梅生活集', 'https://liff.line.me/2008363788-4Ly1Bv0r', '📰', 'linear-gradient(45deg, #f9a825, #ff9800)', 5, true, 'button'),
('房產資訊參考', '', '📊', 'linear-gradient(45deg, #667eea, #764ba2)', 6, true, 'dropdown')
ON CONFLICT DO NOTHING;

-- 建立下拉選單項目資料表（用於房產資訊參考等下拉選單）
CREATE TABLE IF NOT EXISTS related_link_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_link_id UUID REFERENCES related_links(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_related_link_items_parent ON related_link_items(parent_link_id);
CREATE INDEX IF NOT EXISTS idx_related_link_items_display_order ON related_link_items(display_order);

-- 建立更新時間的觸發器
CREATE TRIGGER update_related_link_items_updated_at BEFORE UPDATE ON related_link_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設的下拉選單項目（房產資訊參考）
INSERT INTO related_link_items (parent_link_id, title, url, display_order, is_active)
SELECT 
    id,
    '2026年楊梅趨勢引擊',
    'https://drive.google.com/file/d/1NddGgXcysK-QRoozRA4XXww6c-NUv-OJ/view?usp=sharing',
    1,
    true
FROM related_links WHERE title = '房產資訊參考'
ON CONFLICT DO NOTHING;

INSERT INTO related_link_items (parent_link_id, title, url, display_order, is_active)
SELECT 
    id,
    '新青安寬鬆政策',
    'https://drive.google.com/file/d/1PeGDx2IruOjWkeIHgVVqpk0tceB0l7Vg/view?usp=drive_link',
    2,
    true
FROM related_links WHERE title = '房產資訊參考'
ON CONFLICT DO NOTHING;

INSERT INTO related_link_items (parent_link_id, title, url, display_order, is_active)
SELECT 
    id,
    '2025年房產分析',
    'https://drive.google.com/file/d/1vVluYlY81Ew76Dc4ZyWI_Y9CZ3cWbj0t/view?usp=drive_link',
    3,
    true
FROM related_links WHERE title = '房產資訊參考'
ON CONFLICT DO NOTHING;
