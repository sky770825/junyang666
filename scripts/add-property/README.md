# 單筆物件新增腳本

此資料夾存放「單筆物件」新增用的 HTML 表單與 Node 腳本，僅供一次性或備查使用。

- **日常新增物件**：請使用後台 **admin-dashboard.html** → 物件管理 → 新增物件（或 **property-admin-db.html**）。
- 這裡的檔案不會被首頁或後台連結，僅供需要重現某筆物件或跑腳本時使用。

## 檔案說明

| 類型 | 說明 |
|------|------|
| `add-*-property.html` / `add-*-residence.html` | 瀏覽器開啟的單筆新增表單，需從專案根目錄以相對路徑開啟（或本地 server） |
| `add-*-script.js` | Node 腳本，直接寫入 Supabase，在**專案根目錄**執行 |

## 執行 Node 腳本

在專案根目錄執行（不要進到 `scripts/add-property` 再執行）：

```bash
node scripts/add-property/add-yangmei-new-world-2room-script.js
node scripts/add-property/add-zhongshan-north-store-script.js
# ... 其他腳本
```

需已安裝依賴：`npm install`（含 `@supabase/supabase-js`）。

## 開啟 HTML 表單

若用檔案協定（file://）開啟，需從專案根目錄的 index 或透過本地 server 開啟，例如：

- 從專案根目錄：`open scripts/add-property/add-applevillage-property.html`（路徑會依環境而定）
- 或先跑 `npx serve .` 再開 `http://localhost:3000/scripts/add-property/xxx.html`
