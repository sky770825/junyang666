# Insforge 物件管理後台整合說明

## 📋 概述

物件管理後台已成功整合 Insforge 資料庫和存儲服務。每個新增的物件照片會自動建立以物件編號命名的資料夾進行上傳和管理。

## 🔧 設定步驟

### 1. 安裝 Insforge SDK

```bash
npm install @insforge/sdk
```

### 2. 取得 Insforge 設定資訊

您需要以下資訊：
- **Base URL**: 您的 Insforge 後端網址（例如：`https://dsfp4gvz.us-east.insforge.app`）
- **Anon Key**: 匿名訪問金鑰（可以從 Insforge 後台取得，或使用 MCP 工具生成）

### 3. 設定後台

1. 開啟 `property-admin-db.html`
2. 點擊「⚙️ API 設定」標籤
3. 輸入您的 Insforge Base URL 和 Anon Key
4. 點擊「💾 儲存設定」

## 📁 圖片上傳機制

### 資料夾結構

每個物件的圖片會按照以下結構儲存：

```
property-images/
└── properties/
    ├── 2-1/
    │   ├── 1696123456789_abc123.jpg
    │   ├── 1696123456790_def456.jpg
    │   └── ...
    ├── 2-2/
    │   ├── 1696123456800_ghi789.jpg
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
3. 上傳圖片（圖片會自動儲存到 `properties/{物件編號}/` 資料夾）
4. 填寫其他資訊
5. 點擊「💾 儲存到資料庫」

### 編輯物件

1. 在「📋 物件列表」中找到要編輯的物件
2. 點擊「✏️ 編輯」按鈕
3. 修改資訊
4. 可以新增或刪除圖片
5. 點擊「💾 儲存到資料庫」儲存變更

### 刪除物件

1. 在「📋 物件列表」中找到要刪除的物件
2. 點擊「🗑️ 刪除」按鈕
3. 確認刪除

## 📸 圖片管理

### 上傳圖片

- 支援格式：JPG、PNG、WEBP
- 上傳位置：`property-images/properties/{物件編號}/`
- 檔案命名：自動生成唯一檔名（時間戳 + 隨機字串）

### 圖片預覽

- 上傳後會立即顯示預覽
- 可以點擊「×」按鈕移除圖片
- 移除圖片會從已上傳列表和資料庫中刪除

## ⚙️ 技術細節

### Insforge SDK 使用

```javascript
// 初始化 Client
const insforge = InsForgeSDK.createClient({
    baseUrl: 'https://your-backend-url',
    anonKey: 'your-anon-key'
});

// 上傳圖片
const { data, error } = await insforge.storage
    .from('property-images')
    .upload(`properties/${propertyNumber}/${fileName}`, file);

// 儲存資料
const { data, error } = await insforge.database
    .from('properties')
    .insert([propertyData])
    .select();
```

### 資料夾命名規則

- 資料夾名稱：使用物件編號（例如：`2-1`、`3-2`）
- 檔案名稱：`{時間戳}_{隨機字串}.{副檔名}`
- 完整路徑：`properties/{物件編號}/{檔案名稱}`

## 🔍 故障排除

### SDK 未載入

**問題**：控制台顯示 "⚠️ Insforge SDK 未載入"

**解決方案**：
1. 確認已執行 `npm install @insforge/sdk`
2. 檢查 `node_modules/@insforge/sdk` 資料夾是否存在

### 圖片上傳失敗

**問題**：圖片上傳失敗

**解決方案**：
1. 確認已填寫「物件編號」欄位
2. 檢查 Insforge 設定是否正確
3. 確認 `property-images` bucket 已建立

### 資料庫操作失敗

**問題**：無法儲存或載入物件資料

**解決方案**：
1. 檢查 Insforge Base URL 和 Anon Key 是否正確
2. 確認 `properties` 資料表已建立
3. 檢查瀏覽器控制台的錯誤訊息

## 📝 注意事項

1. **物件編號必須唯一**：每個物件的編號不能重複
2. **先填寫編號**：上傳圖片前必須先填寫物件編號
3. **資料夾自動建立**：無需手動建立資料夾，系統會自動處理
4. **圖片路徑儲存**：圖片 URL 會自動儲存到資料庫，無需手動輸入

## 🎯 功能特色

- ✅ 自動建立物件專屬資料夾
- ✅ 拖曳上傳多張圖片
- ✅ 即時圖片預覽
- ✅ 完整的 CRUD 操作
- ✅ 自動儲存圖片路徑到資料庫
- ✅ 響應式設計，支援手機和桌面

## 📞 支援

如有問題，請檢查：
1. 瀏覽器控制台的錯誤訊息
2. Insforge 後台設定
3. 網路連接狀態

