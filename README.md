# 濬瑒物件2 - 完整版本

## 📁 檔案結構

這個資料夾包含了 `junyang666.html` 的完整功能版本，所有相關檔案都整理在這裡。

## 🔧 動態路徑檢測系統

### 📋 概述
為了同時支援本地開發和GitHub Pages部署，我們實現了智能路徑檢測系統。這個系統會自動檢測當前環境並設定正確的圖片路徑。

### 🎯 支援的檔案
以下物件專頁檔案都具備動態路徑檢測功能：
- `給客戶的物件專頁/2-2.html`
- `給客戶的物件專頁/2-4.html`
- `給客戶的物件專頁/2-5.html`
- `給客戶的物件專頁/2-6.html`
- `給客戶的物件專頁/2-9.html`
- `給客戶的物件專頁/3-6.html`

### 🔍 工作原理

#### 1. 環境檢測
```javascript
const isGitHubPages = window.location.hostname === 'sky770825.github.io';
const basePath = isGitHubPages ? 'images/' : '../images/';
```

#### 2. HTML圖片路徑設定
```html
<!-- 本地路徑，確保本地能立即顯示 -->
<img src="../images/2-X/圖片名稱.jpg" alt="描述">
```

#### 3. JavaScript動態調整
```javascript
function setupImagePaths() {
    const isGitHubPages = window.location.hostname === 'sky770825.github.io';
    const basePath = isGitHubPages ? 'images/' : '../images/';
    
    // 更新所有圖片路徑
    const photoThumbnails = document.querySelectorAll('.photo-thumbnail img');
    photoThumbnails.forEach((img, index) => {
        if (imageSelectors[index]) {
            img.src = imageSelectors[index].src;
        }
    });
}
```

#### 4. 燈箱功能動態路徑
```javascript
function getLightboxImages() {
    const isGitHubPages = window.location.hostname === 'sky770825.github.io';
    const basePath = isGitHubPages ? 'images/' : '../images/';
    
    return [
        basePath + '2-X/圖片1.jpg',
        basePath + '2-X/圖片2.jpg',
        // ... 更多圖片
    ];
}
```

### 🚀 部署行為

| 環境 | HTML初始路徑 | JavaScript調整後 | 結果 |
|------|-------------|-----------------|------|
| **本地開發** | `../images/2-X/` | `../images/2-X/` | ✅ 正常顯示 |
| **GitHub Pages** | `../images/2-X/` | `images/2-X/` | ✅ 正常顯示 |

### 📝 如何新增新的物件專頁

1. **複製現有檔案**：複製一個已修正的HTML檔案作為模板
2. **更新圖片路徑**：將HTML中的圖片路徑改為對應的資料夾
3. **更新JavaScript陣列**：修改 `imageSelectors` 和 `getLightboxImages()` 中的圖片清單
4. **測試**：在本地和GitHub Pages都測試圖片顯示

### 🔧 故障排除

#### 問題：本地看不到圖片
- **檢查**：HTML中的 `src` 是否為 `../images/資料夾/圖片名稱.jpg`
- **檢查**：JavaScript的 `setupImagePaths()` 函數是否存在
- **檢查**：Console是否有錯誤訊息

#### 問題：GitHub Pages看不到圖片
- **檢查**：JavaScript是否正確檢測到 `sky770825.github.io`
- **檢查**：圖片檔案是否已上傳到GitHub
- **檢查**：路徑是否正確（應該是 `images/` 而不是 `../images/`）

#### 問題：燈箱功能異常
- **檢查**：`getLightboxImages()` 函數是否使用動態路徑
- **檢查**：圖片陣列是否與HTML中的圖片數量一致
- **檢查**：燈箱計數器是否正確設定

### 💡 最佳實踐

1. **HTML路徑**：始終使用本地路徑 `../images/` 作為初始值
2. **JavaScript檢測**：使用 `window.location.hostname` 檢測環境
3. **多重執行**：使用 `DOMContentLoaded`、`window.onload` 和 `setTimeout` 確保執行
4. **調試資訊**：在Console輸出詳細的環境檢測和路徑設定資訊
5. **錯誤處理**：為圖片添加 `onerror` 處理，隱藏載入失敗的圖片

### 📄 主要檔案

- **`junyang666.html`** - 主要網頁檔案 (3448行)
  - 包含完整的物件展示系統
  - 內嵌所有物件資料 (16個物件)
  - 包含貸款試算功能
  - 響應式設計，支援手機和桌面版

- **`script.js`** - JavaScript 功能檔案 (57,955 bytes)
  - 物件卡片渲染
  - 搜尋和篩選功能
  - 分頁系統
  - 照片燈箱功能

- **`style.css`** - CSS 樣式檔案 (46,412 bytes)
  - 響應式設計
  - 物件卡片樣式
  - 彈窗和燈箱樣式

### 🖼️ 圖片資料

- **`images/`** 資料夾包含所有物件照片
  - 2-1 到 2-6：2房物件照片
  - 3-1 到 3-6：3房物件照片  
  - 4-1 到 4-6：4房物件照片
  - 總計 221 張照片

### ✨ 主要功能

1. **物件展示**
   - 16個精選物件
   - 詳細資訊彈窗
   - 照片燈箱瀏覽
   - Google Maps 整合

2. **貸款試算**
   - 完整的房貸計算器
   - 支援新青安貸款
   - 買方費用計算
   - 即時計算結果

3. **響應式設計**
   - 手機版優化
   - 平板版適配
   - 桌面版完整功能

4. **搜尋和篩選**
   - 依房型篩選
   - 價格範圍篩選
   - 即時搜尋

### 🚀 使用方式

1. 直接在瀏覽器中開啟 `junyang666.html`
2. 所有功能都可正常使用
3. 支援離線瀏覽（除了 Google Maps）

### 📞 聯絡資訊

- **蔡濬瑒**: 0928-776-755
- **劉子菲**: 0925-666-597
- **LINE**: https://lin.ee/Lax7jMka

---

## 📋 房產物件上架流程與注意事項

### 🔄 **基本流程**

1. **準備階段**
   - 將物件照片整理到 `images/X-X/` 資料夾
   - 確保圖片檔名與實際檔案一致
   - 準備物件詳細資料（價格、坪數、格局等）
   - 準備 Google Maps 地圖連結

2. **資料更新**
   - 使用 `search_replace` 工具精確更新 HTML 中的物件資料
   - 按照標準格式更新所有欄位
   - 確保資料完整性
   - **自動定位學區交通**：根據地圖連結自動搜尋並補齊學區、交通、生活機能資訊
   - **避免重複內容**：學區交通已包含的項目不在 features 中重複列出

3. **機能確認流程** ⭐
   - **必須使用物件提供的 Google Maps 連結來確認實際位置**
   - **學區範圍**：確認1公里內最近的學校
   - **交通設施**：確認2公里內最近的交通節點（火車站、交流道、公車站）
   - **生活機能**：確認1公里內最近的市場、公園、商圈
   - **不要憑空猜測**：一定要透過地圖座標來驗證距離
   - **嚴格分類**：
     - `transport` 只能放：火車站、交流道、公車站、捷運站等交通節點
     - `schools` 只能放：學校名稱（包含國小、國中、高中、大學、幼兒園）
     - `market` 只能放：市場名稱
     - `park` 只能放：公園名稱
     - `facilities` 只能放：商店、餐廳、醫院、銀行等生活設施（必須使用具體店名，如「職人五金」而非「大型五金量販」）
     - **絕對不能**：把學區資訊放在交通設施中
   - **範例**：
     - 2-1物件（梅獅路二段232巷）→ 陽光國小、瑞塘國小、瑞坪國中、萬大市場、四維公園、埔心火車站
     - 2-2物件（金山街275巷）→ 楊明國中、楊明國小、楊梅市場、楊明公園、楊梅火車站
     - 3-4物件（瑞梅街220巷）→ 瑞梅國小、瑞塘國小、瑞坪國中、楊梅市場、頭重溪公園、埔心火車站

### 📝 **資料格式標準**

**地址格式：**
```
楊梅區XX路XX段***號X樓
```
- 門牌號碼必須用 `***` 遮住保護隱私
- 不要包含「桃園市」前綴

**標題格式：**
```
特色描述 | 房型+車位 | 位置優勢
```
例如：「楊明雙學區 | 景觀2房車」、「誠售 | 超大室內 | 3+1房雙車位」

**圖片順序：**
- 第一張：客廳照片（不看檔名，只要是客廳內容）
- 中間：其他室內照片（隨意排列，不能重複）
- 最後一張：格局圖照片（不看檔名，只要是格局圖內容）

### 🔧 **技術要點**

1. **資料結構**
   - `transportation` 使用物件格式：`{facilities: [], transport: [], schools: [], market: "", park: ""}`
   - `features` 使用陣列格式，包含所有屋況特色
   - 確保 `main_area`, `ancillary_area`, `parking_area`, `common_area` 等坪數欄位完整

2. **響應式設計**
   - 標題會自動調整字體大小防止換行
   - 支援手機、平板、桌面各種螢幕尺寸
   - 使用 `adjustTitleFontSize()` 函數動態調整

3. **圖片管理**
   - 確保圖片路徑與實際檔案名稱完全一致
   - 使用實際存在的檔案名稱

### ✅ **品質控制檢查清單**

- [ ] 價格、坪數、屋齡等數值準確
- [ ] 地址格式正確，門牌用***遮住
- [ ] 標題簡潔有力，突出特色
- [ ] 圖片順序正確（客廳第一，格局圖最後）
- [ ] 圖片檔案路徑正確
- [ ] 地圖連結有效
- [ ] 響應式顯示正常
- [ ] 所有必填欄位完整

### 🎯 **重要工作規則**

1. **學區交通自動補齊**
   - 根據提供的 Google Maps 地圖連結自動搜尋該位置的學區、交通、生活機能
   - 自動補齊 `transportation` 物件中的 `facilities`, `transport`, `schools`, `market`, `park` 欄位
   - 不需要使用者額外說明，直接按照標準流程自動處理

2. **機能特色避免重複**
   - 學區交通資訊中已包含的項目，不要在 `features` 陣列中重複列出
   - 例如：`transportation.schools` 已有「楊明國中、楊明國小」，就不在 `features` 中重複
   - 例如：`transportation.transport` 已有「楊梅交流道、埔心火車站」，就不在 `features` 中重複
   - 例如：`transportation.facilities` 已有「梅獅路商圈、UNIQLO、星巴克」，就不在 `features` 中重複
   - `features` 專注於屋況特色、裝潢狀況、社區特色、房屋優勢（如：屋齡新、採光佳、前後陽台等）

3. **隱私保護**：門牌號碼必須用***遮住
4. **車位編號處理**
   - 如果車位沒有提供編號，詳細資訊浮框內的車位編號欄位填寫「洽業務」
   - 確保權狀坪數和車位資訊的一致性

5. **資料一致性**：確保所有數值與實際資料完全一致
6. **圖片管理**：使用實際存在的檔案名稱
7. **標題優化**：避免過長導致換行
8. **響應式測試**：確保各種螢幕尺寸下顯示正常

9. **坪數計算規則**
   - 主建物 + 附屬建物 + 車位 + 公設 = 總坪數
   - 如果計算不符，需要重新核對各項坪數
   - 公設比計算：公設 ÷ 總坪數 × 100%

10. **物件狀態統一**
    - 現況統一用「空屋,隨時可看」或「自住,需提前約」
    - 建築型態統一用「大樓」、「大廈」、「電梯大樓」
    - 裝潢程度統一用「有」、「無」、「簡易裝潢」、「中檔裝潢」

11. **圖片檔案管理**
    - 不看檔名，按照內容排序：客廳第一張，格局圖最後一張
    - 中間照片隨意排列，但不能重複使用同一張
    - LINE_ALBUM 系列照片保持原始檔名
    - 確保所有圖片檔案都實際存在於對應資料夾中

12. **地圖連結格式**
    - 必須使用 Google Maps embed 格式
    - 確保連結有效且能正確顯示物件位置

---

## 🏷️ 物件狀態標籤系統

### 📋 **建議的狀態標籤類型**

#### 🔥 **緊急類標籤**
- **急售** (`urgent`) - 鮮紅色漸層，快速脈衝動畫
- **即將售出** (`about-to-sell`) - 柔和紅色漸層，中等脈衝動畫
- **限時優惠** (`limited-time`) - 橙色漸層，吸引注意

#### 💰 **價格類標籤**
- **低於鑑價** (`below-appraisal`) - 藍色漸層，表示價格優勢
- **議價空間** (`negotiable`) - 綠色漸層，表示可談價
- **特價出售** (`special-price`) - 紫色漸層，突出優惠

#### 📈 **市場類標籤**
- **熱門物件** (`hot`) - 紅色漸層，表示受歡迎
- **稀有釋出** (`rare`) - 金色漸層，表示難得機會
- **投資首選** (`investment`) - 深藍色漸層，適合投資

#### 🏠 **屋況類標籤**
- **全新裝潢** (`new-renovation`) - 綠色漸層，突出裝潢
- **景觀戶** (`view`) - 天藍色漸層，突出景觀
- **邊間戶** (`corner`) - 深綠色漸層，突出位置

#### ⏰ **時間類標籤**
- **斡旋中** (`negotiating`) - 深藍色漸層，表示正在談判
- **即將上架** (`coming-soon`) - 灰色漸層，預告新物件
- **暫停銷售** (`paused`) - 灰色漸層，暫時不賣

### 🎨 **標籤設計特點**

1. **顏色系統**
   - 紅色系：緊急、熱門、限時
   - 藍色系：價格優勢、投資、斡旋
   - 綠色系：議價、裝潢、位置優勢
   - 橙色系：優惠、特價
   - 紫色系：特殊、稀有
   - 金色系：高價值、稀有
   - 灰色系：暫停、預告

2. **動畫效果**
   - 緊急標籤：快速脈衝（1.5秒）
   - 一般標籤：中等脈衝（2-2.5秒）
   - 暫停標籤：慢速脈衝（3秒）

3. **位置設計**
   - 物件卡片：右上角
   - 詳細資訊彈窗：右上角（靠近關閉按鈕）

### 💻 **技術實現**

#### CSS 類別命名規則
```css
.status-{status-name}          /* 物件卡片標籤 */
.modal-status-{status-name}    /* 彈窗標籤 */
```

#### 物件資料結構
```javascript
{
    status: "status-name",      // 狀態識別碼
    statusText: "顯示文字"      // 標籤顯示文字
}
```

#### 使用範例
```javascript
// 急售標籤
{
    status: "urgent",
    statusText: "急售"
}

// 低於鑑價標籤
{
    status: "below-appraisal", 
    statusText: "低於鑑價"
}

// 即將售出標籤
{
    status: "about-to-sell",
    statusText: "即將售出"
}
```

### 🚀 **擴展建議**

1. **動態標籤**
   - 根據市場狀況自動調整標籤
   - 時間敏感標籤自動過期

2. **標籤組合**
   - 支援多個標籤同時顯示
   - 標籤優先級排序

3. **自定義標籤**
   - 允許業務自定義標籤文字
   - 支援特殊活動標籤

### 📱 **響應式設計**
- 手機版：標籤大小自動調整
- 平板版：保持適當比例
- 桌面版：完整動畫效果

---

## 🎉 **最終狀態報告** (2024年最新)

### ✅ **完全解決的問題**

1. **圖片路徑雙環境兼容**
   - ✅ 本地環境：使用 `../images/2-X/` 路徑
   - ✅ GitHub Pages：自動切換為 `images/2-X/` 路徑
   - ✅ 智能檢測：基於hostname、protocol、pathname多重判斷

2. **所有物件專頁狀態**
   - ✅ 2-2.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 2-4.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 2-5.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 2-6.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 2-9.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 3-6.html：本地 + GitHub Pages 完全正常 + 封面照已更新
   - ✅ 4-2.html：本地 + GitHub Pages 完全正常 + 封面照已更新

3. **技術實現特點**
   - ✅ 多重執行保障：DOMContentLoaded + window.onload + setTimeout
   - ✅ 改進的環境檢測邏輯
   - ✅ 完整的調試功能：testImagePaths()
   - ✅ 燈箱功能完全兼容雙環境

### 🔧 **最終檢測邏輯**
```javascript
const isGitHubPages = window.location.hostname === 'sky770825.github.io' || 
                      window.location.pathname.includes('junyang666') ||
                      (window.location.protocol === 'https:' && window.location.hostname !== 'localhost');
const basePath = isGitHubPages ? 'images/' : '../images/';
```

### 🎯 **部署確認**
- **本地開發**：所有圖片立即顯示，無需等待JavaScript
- **GitHub Pages**：JavaScript自動調整路徑，圖片正常顯示
- **燈箱功能**：雙環境完全兼容
- **PDF複製**：URL正確無中文路徑

### 📊 **測試結果**
- 本地測試：✅ 通過
- GitHub Pages測試：✅ 通過
- 燈箱功能：✅ 通過
- 響應式設計：✅ 通過
- 所有設備兼容：✅ 通過

---

## 🔄 **最新更新記錄** (2024年12月)

### 📸 **全站封面照更新**

**更新內容：**
- ✅ **2-2.html**：替換外部圖片連結為本地 `images/2-2/封面照.jpeg`
- ✅ **2-4.html**：替換外部圖片連結為本地 `images/2-4/封面照.jpg`
- ✅ **2-5.html**：替換外部圖片連結為本地 `images/2-5/封面照.jpeg`
- ✅ **2-6.html**：替換外部圖片連結為本地 `images/2-6/封面照.jpg`
- ✅ **2-9.html**：替換外部圖片連結為本地 `images/2-9/封面照.jpeg`
- ✅ **3-6.html**：替換外部圖片連結為本地 `images/3-6/封面照.jpg`
- ✅ **4-2.html**：替換外部圖片連結為本地 `images/4-2/封面照.png`
- ✅ 所有文件都添加了封面照的動態路徑檢測功能

**技術實現：**
```javascript
// 更新封面照路徑
const coverImage = document.querySelector('.header img');
if (coverImage) {
    coverImage.src = basePath + '2-2/封面照.jpeg';
    console.log(`✅ 設定封面照: ${coverImage.src}`);
}
```

**效果：**
- 本地環境：立即顯示本地封面照
- GitHub Pages：JavaScript自動調整路徑
- 雙環境完美兼容：無需手動切換

---

*🎉 此版本已完全解決所有圖片顯示問題，雙環境完美兼容！*
