# 🏠 物件管理系統（資料庫版）

## 📋 功能特色

✅ **圖片直接上傳** - 不用手動轉網址，拖曳即可上傳  
✅ **資料庫儲存** - 使用 SQLite 資料庫，資料持久化  
✅ **自動生成 URL** - 上傳後自動生成圖片網址  
✅ **CRUD 完整功能** - 新增、讀取、更新、刪除物件  
✅ **即時預覽** - 上傳圖片後立即預覽  

---

## 🚀 快速開始

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 啟動後端伺服器

```bash
npm start
```

或者使用開發模式（自動重啟）：

```bash
npm run dev
```

### 3. 打開管理後台

在瀏覽器中打開 `property-admin-db.html`

---

## 📁 檔案結構

```
專案資料夾/
├── server.js              # 後端 API 伺服器
├── package.json           # Node.js 專案設定
├── properties.db          # SQLite 資料庫（自動產生）
├── uploads/               # 上傳的圖片資料夾（自動產生）
├── property-admin-db.html # 管理後台頁面
└── README-資料庫版.md    # 說明文件
```

---

## 🎯 使用方式

### 步驟 1：啟動後端

```bash
# 在終端機執行
cd "專案資料夾路徑"
npm install
npm start
```

您應該會看到：
```
✅ 已連接到 SQLite 資料庫
✅ 資料表已準備就緒
🚀 伺服器運行在 http://localhost:3000
```

### 步驟 2：打開管理後台

1. 打開 `property-admin-db.html`
2. 確認 API 網址是 `http://localhost:3000/api`
3. 開始使用！

### 步驟 3：新增物件

1. 點擊「➕ 新增物件」標籤
2. 填寫物件基本資訊
3. **拖曳或點擊上傳圖片**（可一次多張）
4. 點擊「💾 儲存到資料庫」
5. 完成！

---

## 🖼️ 圖片上傳

### 支援的格式
- JPG / JPEG
- PNG
- GIF
- WEBP

### 上傳方式
1. **拖曳上傳**：直接將圖片拖到上傳區域
2. **點擊上傳**：點擊上傳區域選擇檔案
3. **多檔上傳**：可一次選擇多張圖片

### 圖片儲存位置
- 本地檔案：`uploads/` 資料夾
- 訪問網址：`http://localhost:3000/uploads/檔名.jpg`

---

## 🔌 API 端點

### 圖片上傳
```
POST /api/upload
Content-Type: multipart/form-data
Body: image (檔案)
```

### 取得所有物件
```
GET /api/properties
```

### 取得單一物件
```
GET /api/properties/:id
```

### 新增物件
```
POST /api/properties
Content-Type: application/json
Body: { 物件資料 }
```

### 更新物件
```
PUT /api/properties/:id
Content-Type: application/json
Body: { 物件資料 }
```

### 刪除物件
```
DELETE /api/properties/:id
```

---

## 💾 資料庫結構

### properties 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | TEXT | 物件唯一 ID |
| title | TEXT | 物件標題 |
| type | TEXT | 房型（2房/3房/4房） |
| price | TEXT | 售價 |
| images | TEXT | 圖片 URL 陣列（JSON） |
| ... | ... | 其他欄位 |

---

## 🔧 設定說明

### 修改 Port

在 `server.js` 中修改：

```javascript
const PORT = process.env.PORT || 3000; // 改成您想要的 Port
```

### 修改圖片大小限制

在 `server.js` 中修改：

```javascript
limits: {
    fileSize: 10 * 1024 * 1024 // 改成您想要的大小（位元組）
}
```

### 修改圖片儲存位置

在 `server.js` 中修改：

```javascript
const uploadsDir = path.join(__dirname, 'uploads'); // 改成您想要的路徑
```

---

## 🌐 部署到生產環境

### 使用 PM2（推薦）

```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
pm2 start server.js --name property-api

# 查看狀態
pm2 status

# 重啟服務
pm2 restart property-api

# 查看日誌
pm2 logs property-api
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:3000;
    }
}
```

---

## ❓ 常見問題

### Q: 圖片上傳失敗？
**A:** 
1. 檢查 `uploads/` 資料夾是否存在且有寫入權限
2. 檢查圖片大小是否超過限制（預設 10MB）
3. 檢查圖片格式是否支援

### Q: 無法連接到資料庫？
**A:**
1. 確認 Node.js 已正確安裝
2. 確認 `sqlite3` 套件已安裝：`npm install sqlite3`
3. 檢查資料庫檔案權限

### Q: API 連接失敗？
**A:**
1. 確認後端伺服器已啟動（`npm start`）
2. 確認 Port 是否正確（預設 3000）
3. 檢查防火牆設定

### Q: 如何備份資料？
**A:**
```bash
# 備份資料庫
cp properties.db properties.db.backup

# 備份圖片
cp -r uploads uploads_backup
```

---

## 🎉 優勢對比

| 功能 | 舊版（手動） | 資料庫版 |
|------|------------|---------|
| 圖片上傳 | ❌ 需手動轉網址 | ✅ 拖曳上傳 |
| 資料儲存 | ❌ JavaScript 檔案 | ✅ SQLite 資料庫 |
| 管理物件 | ❌ 手動編輯程式碼 | ✅ 網頁後台 |
| 資料查詢 | ❌ 需重新載入頁面 | ✅ 即時查詢 |
| 資料備份 | ❌ 手動備份檔案 | ✅ 資料庫備份 |

---

## 📝 授權

MIT License

---

## 🙋 需要協助？

如有任何問題，請檢查：
1. Node.js 版本（建議 v16+）
2. 套件是否正確安裝
3. 後端伺服器是否正常運行
4. 瀏覽器控制台是否有錯誤訊息
