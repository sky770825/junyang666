# Cloudflare Pages 部署指南

## 🚀 部署步驟

### 方法 1：通過 Cloudflare Dashboard 連接 GitHub（推薦）

1. **登入 Cloudflare Dashboard**
   - 訪問：https://dash.cloudflare.com
   - 進入您的專案：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/flyjung168

2. **連接 GitHub 倉庫**
   - 點擊「Connect to Git」
   - 選擇 GitHub
   - 授權 Cloudflare 訪問您的 GitHub 帳號
   - 選擇倉庫：`sky770825/junyang666`
   - 選擇分支：`main`

3. **設定建置配置**
   - **Framework preset**: None（或 Static）
   - **Build command**: （留空，因為是靜態網站）
   - **Build output directory**: `/`（根目錄）
   - **Root directory**: `/`（根目錄）

4. **環境變數**（如果需要）
   - 通常不需要，因為前端從後端 API 載入資料

5. **點擊「Save and Deploy」**
   - Cloudflare 會自動從 GitHub 拉取程式碼並部署

### 方法 2：使用 Wrangler CLI 部署

1. **安裝 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登入 Cloudflare**
   ```bash
   wrangler login
   ```

3. **部署到 Cloudflare Pages**
   ```bash
   wrangler pages deploy . --project-name=flyjung168
   ```

## ⚠️ 重要注意事項

### 1. **後端 API 需要單獨部署**

Cloudflare Pages **只支援靜態網站**，不支援 Node.js 後端。

您的 `server.js` 需要單獨部署到：
- **Vercel**（推薦）
- **Railway**
- **Render**
- **Fly.io**
- 或其他 Node.js 託管服務

### 2. **修改前端 API URL**

部署後，需要修改前端的 API URL 指向您的後端伺服器。

在 `modules/related-links/frontend.js` 中，`getApiBaseUrl()` 函數會自動判斷：
- 本地開發：`http://localhost:3000/api`
- 生產環境：`window.location.origin + '/api'`（如果後端在同一網域）

**如果後端在不同網域**，需要修改：

```javascript
// modules/related-links/frontend.js
function getApiBaseUrl() {
    // 生產環境的後端 API URL
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
        return 'https://your-backend-api.vercel.app/api'; // 改為您的後端 URL
    }
    return 'http://localhost:3000/api';
}
```

### 3. **CORS 設定**

確保後端 `server.js` 的 CORS 設定允許 Cloudflare Pages 的網域：

```javascript
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://flyjung168.pages.dev', // Cloudflare Pages 網域
        'https://your-custom-domain.com' // 您的自訂網域
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));
```

## 📁 部署檔案清單

Cloudflare Pages 會部署以下檔案：
- ✅ `index.html` - 主頁面
- ✅ `property-detail.html` - 獨立頁面
- ✅ `modules/` - 模組檔案
- ✅ `supabase-config.js` - Supabase 配置
- ✅ 所有 HTML、CSS、JS 檔案

**不會部署**：
- ❌ `server.js` - 需要單獨部署
- ❌ `package.json` - 不需要（靜態網站）
- ❌ `node_modules/` - 不需要
- ❌ `properties.db` - 資料庫檔案
- ❌ `uploads/` - 圖片資料夾

## 🔧 部署後設定

### 1. 設定自訂網域（可選）

在 Cloudflare Pages 設定中：
1. 點擊「Custom domains」
2. 添加您的網域
3. 按照指示設定 DNS

### 2. 設定環境變數（如果需要）

在 Cloudflare Pages 設定中：
1. 點擊「Settings」→「Environment variables」
2. 添加變數（如果需要）

## 🧪 測試部署

部署完成後：
1. 訪問 Cloudflare Pages 提供的 URL
2. 檢查頁面是否正常載入
3. 檢查瀏覽器控制台是否有錯誤
4. 測試相關連結是否正常顯示
5. 測試物件卡片是否正常顯示

## 📝 部署檢查清單

- [ ] GitHub 倉庫已推送最新程式碼
- [ ] Cloudflare Pages 已連接 GitHub 倉庫
- [ ] 建置配置已設定（無需建置命令）
- [ ] 後端 API 已單獨部署
- [ ] 前端 API URL 已更新為後端 URL
- [ ] CORS 已設定允許 Cloudflare Pages 網域
- [ ] 測試所有功能是否正常

## 🆘 常見問題

### Q: 為什麼相關連結無法載入？

**A:** 檢查：
1. 後端 API 是否正常運行
2. API URL 是否正確設定
3. CORS 是否允許 Cloudflare Pages 網域

### Q: 為什麼圖片無法顯示？

**A:** 檢查：
1. 圖片是否已上傳到 Supabase Storage
2. 圖片 URL 是否正確
3. Supabase Storage 的 RLS 策略是否允許公開讀取

### Q: 如何更新部署？

**A:** 
- 如果使用 GitHub 連接，推送新程式碼到 `main` 分支會自動觸發重新部署
- 如果使用 CLI，再次執行 `wrangler pages deploy`
