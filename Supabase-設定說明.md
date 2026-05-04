# Supabase 物件管理後台整合說明

## 📋 概述

物件管理後台已成功整合 Supabase 資料庫和存儲服務。每個新增的物件照片會自動建立以物件編號命名的資料夾進行上傳和管理。

## 🔧 設定步驟

### 1. 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/project/cnzqtuuegdqwkgvletaa)
2. 確認您的專案 URL 和 Anon Key

### 2. 建立資料表

在 Supabase SQL Editor 中執行以下 SQL：

```sql
-- 建立 properties 資料表
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    address TEXT NOT NULL,
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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_properties_number ON properties(number);
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- 啟用 Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 建立政策：允許所有人讀取已上架的物件
CREATE POLICY "任何人都可以讀取已上架的物件"
    ON properties FOR SELECT
    USING (is_published = true);

-- 建立政策：允許所有人讀取所有物件（用於後台管理）
-- 注意：在生產環境中，您應該使用認證來限制這個政策
CREATE POLICY "任何人都可以讀取所有物件（後台）"
    ON properties FOR SELECT
    USING (true);

-- 建立政策：允許插入（需要認證）
-- 注意：在生產環境中，您應該使用認證來限制這個政策
CREATE POLICY "任何人都可以插入物件"
    ON properties FOR INSERT
    WITH CHECK (true);

-- 建立政策：允許更新（需要認證）
-- 注意：在生產環境中，您應該使用認證來限制這個政策
CREATE POLICY "任何人都可以更新物件"
    ON properties FOR UPDATE
    USING (true);

-- 建立政策：允許刪除（需要認證）
-- 注意：在生產環境中，您應該使用認證來限制這個政策
CREATE POLICY "任何人都可以刪除物件"
    ON properties FOR DELETE
    USING (true);
```

### 3. 建立 Storage Bucket

1. 前往 Supabase Dashboard → Storage
2. 建立新的 bucket，名稱為 `junyang666`
3. 設定 bucket 為公開（Public）
4. 在 Storage Policies 中設定以下政策：

```sql
-- 允許所有人讀取
CREATE POLICY "任何人都可以讀取圖片"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'junyang666');

-- 允許所有人上傳
CREATE POLICY "任何人都可以上傳圖片"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'junyang666');

-- 允許所有人更新
CREATE POLICY "任何人都可以更新圖片"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'junyang666');

-- 允許所有人刪除
CREATE POLICY "任何人都可以刪除圖片"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'junyang666');
```

### 4. 設定後台

1. 開啟 `property-admin-db.html`
2. 點擊「⚙️ API 設定」標籤
3. 輸入您的 Supabase URL 和 Anon Key
4. 點擊「💾 儲存設定」

## 📁 圖片上傳機制

### 資料夾結構

每個物件的圖片會按照以下結構儲存：

```
junyang666/
└── properties/
    ├── 2-1/
    │   ├── 1696123456789_0_abc123.jpg
    │   ├── 1696123456790_1_def456.jpg
    │   └── ...
    ├── 2-2/
    │   ├── 1696123456800_0_ghi789.jpg
    │   └── ...
    └── 3-1/
        └── ...
```

### 上傳流程

1. **填寫物件編號**：在新增物件時，必須先填寫「物件編號」欄位（例如：`2-1`、`3-2`）
2. **上傳圖片**：點擊或拖曳圖片到上傳區域
3. **自動建立資料夾**：系統會自動使用物件編號建立資料夾 `properties/{物件編號}/`
4. **儲存路徑**：圖片 URL 會自動儲存到資料庫的 `images` 欄位

## 💾 資料庫結構

### properties 資料表

已建立的資料表包含以下欄位：

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 唯一識別碼（自動生成） |
| number | TEXT | 物件編號（唯一） |
| title | TEXT | 物件標題 |
| type | TEXT | 房型（2房/3房/4房） |
| address | TEXT | 地址 |
| price | TEXT | 售價 |
| layout | TEXT | 格局 |
| total_area | TEXT | 總坪數 |
| **is_published** | BOOLEAN | **上架狀態（true=上架，false=下架）** |
| status | TEXT | 物件狀態（new/sold/urgent等） |
| status_text | TEXT | 狀態文字 |
| images | JSONB | 圖片 URL 陣列 |
| transportation | JSONB | 交通與設施資訊 |
| features | JSONB | 物件特色 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |
| ... | ... | 其他欄位 |

## 🚀 使用方式

### 新增物件

1. 點擊「➕ 新增物件」標籤
2. 填寫物件基本資訊（**必須先填寫物件編號**）
3. **選擇上架狀態**：選擇「✅ 上架」或「❌ 下架」
4. 上傳圖片（圖片會自動儲存到 `properties/{物件編號}/` 資料夾）
5. 填寫其他資訊
6. 點擊「💾 儲存到資料庫」

### 編輯物件

1. 在「📋 物件列表」中找到要編輯的物件
2. 點擊「✏️ 編輯」按鈕
3. 修改資訊（包括上架狀態）
4. 可以新增或刪除圖片
5. 點擊「💾 儲存到資料庫」儲存變更

### 上架/下架物件

1. 在「📋 物件列表」中找到要操作的物件
2. 點擊「⬆️ 上架」或「⬇️ 下架」按鈕
3. 系統會立即更新物件的上架狀態
4. 上架的物件會顯示在前台，下架的物件僅在後台可見

### 刪除物件

1. 在「📋 物件列表」中找到要刪除的物件
2. 點擊「🗑️ 刪除」按鈕
3. 確認刪除

## 📸 圖片管理

### 上傳圖片

- 支援格式：JPG、PNG、WEBP
- 上傳位置：`junyang666/properties/{物件編號}/`
- 檔案命名：自動生成唯一檔名（時間戳 + 索引 + 隨機字串）

### 圖片預覽

- 上傳後會立即顯示預覽
- 可以點擊「×」按鈕移除圖片
- 移除圖片會從已上傳列表和資料庫中刪除

## ⚙️ 技術細節

### Supabase SDK 使用

```javascript
// 初始化 Client
const supabase = supabase.createClient(
    'https://cnzqtuuegdqwkgvletaa.supabase.co',
    'your-anon-key'
);

// 上傳圖片
const { data, error } = await supabase.storage
    .from('junyang666')
    .upload(`properties/${propertyNumber}/${fileName}`, file);

// 取得公開 URL
const { data: urlData } = supabase.storage
    .from('junyang666')
    .getPublicUrl(`properties/${propertyNumber}/${fileName}`);

// 儲存資料
const { data, error } = await supabase
    .from('properties')
    .insert([propertyData])
    .select();
```

### 資料夾命名規則

- 資料夾名稱：使用物件編號（例如：`2-1`、`3-2`）
- 檔案名稱：`{時間戳}_{索引}_{隨機字串}.{副檔名}`
- 完整路徑：`properties/{物件編號}/{檔案名稱}`

## 🔍 故障排除

### SDK 未載入

**問題**：控制台顯示 "⚠️ Supabase SDK 未載入"

**解決方案**：
1. 確認網路連接正常
2. 檢查 Supabase CDN 是否可訪問

### 圖片上傳失敗

**問題**：圖片上傳失敗

**解決方案**：
1. 確認已填寫「物件編號」欄位
2. 檢查 Supabase 設定是否正確
3. 確認 `junyang666` bucket 已建立且為公開
4. 檢查 Storage Policies 是否正確設定

### 資料庫操作失敗

**問題**：無法儲存或載入物件資料

**解決方案**：
1. 檢查 Supabase URL 和 Anon Key 是否正確
2. 確認 `properties` 資料表已建立
3. 檢查 Row Level Security (RLS) 政策是否正確設定
4. 檢查瀏覽器控制台的錯誤訊息

## 📝 注意事項

1. **物件編號必須唯一**：每個物件的編號不能重複
2. **先填寫編號**：上傳圖片前必須先填寫物件編號
3. **資料夾自動建立**：無需手動建立資料夾，系統會自動處理
4. **圖片路徑儲存**：圖片 URL 會自動儲存到資料庫，無需手動輸入
5. **上架/下架功能**：使用 `is_published` 欄位控制物件是否在前台顯示
6. **安全性**：在生產環境中，建議使用 Supabase Auth 來限制資料庫和 Storage 的訪問權限

## 🎯 功能特色

- ✅ 自動建立物件專屬資料夾
- ✅ 拖曳上傳多張圖片
- ✅ 即時圖片預覽
- ✅ 完整的 CRUD 操作
- ✅ 自動儲存圖片路徑到資料庫
- ✅ **上架/下架功能**
- ✅ 響應式設計，支援手機和桌面

## 📞 支援

如有問題，請檢查：
1. 瀏覽器控制台的錯誤訊息
2. Supabase Dashboard 設定
3. 網路連接狀態
4. Storage Policies 和 RLS 政策設定
