# 模組化物件管理系統

這是一個將原本 `index.html` 中的物件相關功能分離出來的模組化版本，讓代碼更容易維護和管理。

## 檔案結構

```
modular-properties/
├── index.html              # 模組化版本的主頁面
├── photo-sets.js          # 照片集合資料模組
├── property-data.js       # 物件詳細資料模組
├── pagination-system.js   # 分頁系統模組
├── property-content.js    # 物件內容生成模組
└── README.md              # 說明文件
```

## 功能特色

### 1. 模組化設計
- **photo-sets.js**: 存放所有照片集合資料，與原始 script.js 完全相容
- **property-data.js**: 存放所有物件的詳細資料和資訊
- **pagination-system.js**: 完整的分頁系統，包含搜尋、篩選、分頁功能
- **property-content.js**: 包含物件卡片、統計資訊、相關連結等內容生成函數
- **index.html**: 簡化的主頁面，使用原始的 script.js 和 style.css

### 2. 使用原始檔案
- **script.js**: 使用你原本的主要 JavaScript 檔案
- **style.css**: 使用你原本的主要樣式檔案
- 所有功能都與原版本完全相同

### 3. 完整功能
- **物件管理**: 6個完整物件資料（2房、3房、4房各2個）
- **分頁系統**: 每頁顯示6個物件，支援分頁導航
- **搜尋功能**: 可搜尋物件名稱、地址、社區
- **篩選功能**: 按房型篩選（2房、3房、4房）
- **照片燈箱**: 使用原始 script.js 的燈箱功能
- **統計資訊**: 動態生成物件統計
- **相關連結**: 包含所有原始連結和下拉選單
- **客戶見證**: 完整的客戶見證輪播（8個見證）

### 4. 保持原有功能
- 照片燈箱瀏覽（支援縮圖導航）
- 分頁切換功能
- 地圖切換功能
- 手機觸控優化
- 所有原始功能都保留

## 使用方式

### 基本使用
1. 直接開啟 `modular-properties/index.html` 即可使用
2. 所有功能與原版本相同

### 添加新物件
在 `properties-data.js` 中的 `embeddedPropertiesData.properties` 陣列添加新物件：

```javascript
{
    id: "prop_003",
    title: "新物件標題",
    number: "3-1",
    type: "3房",
    address: "物件地址",
    price: "1200萬",
    total_area: "45坪",
    main_area: "25坪",
    layout: "3房2廳2衛",
    age: "5年",
    floor: "8/15樓",
    management_fee: "2500元/月",
    orientation: "座北朝南",
    parking_type: "平面車位",
    parking_space: "B2-15",
    current_status: "空屋",
    images: [
        "images/3-1/客廳.jpg",
        "images/3-1/主臥房.jpg"
    ],
    transportation: {
        facilities: ["全聯福利中心", "7-ELEVEN"],
        transport: ["楊梅火車站", "楊梅交流道"],
        schools: ["楊明國中", "楊明國小"],
        market: "楊梅市場",
        park: "楊明公園"
    },
    features: [
        "近學區",
        "交通便利",
        "管理完善"
    ],
    google_maps: "https://maps.google.com/..."
}
```

### 修改物件資料
直接編輯 `properties-data.js` 檔案中的物件資料即可。

## 與原版本的差異

### 優點
1. **代碼分離**: 物件資料和邏輯分離，更易維護
2. **模組化**: 每個功能獨立，便於擴展
3. **檔案較小**: 主頁面檔案大幅縮小
4. **易於管理**: 新增物件只需修改資料檔案

### 保持不變
1. **外觀設計**: 完全保持原有的視覺效果
2. **功能完整**: 所有原有功能都保留
3. **響應式**: 手機和桌面版本都正常運作
4. **效能**: 載入速度和原版本相同

## 技術細節

### 依賴檔案
- `../style.css`: 樣式檔案
- `../script.js`: 主要 JavaScript 功能
- `../images/`: 圖片資料夾

### 瀏覽器支援
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 開發說明

### 擴展功能
如需添加新功能，可以：
1. 在 `property-card.js` 中添加新的方法
2. 在 `properties-data.js` 中添加新的資料結構
3. 在 `index.html` 中添加新的 UI 元素

### 自訂樣式
可以修改 `index.html` 中的 `<style>` 區塊來自訂樣式，或創建新的 CSS 檔案。

## 注意事項

1. 確保所有依賴檔案路徑正確
2. 圖片路徑需要相對於主目錄
3. 新增物件時請確保資料格式正確
4. 建議定期備份資料檔案

## 版本歷史

- v1.0: 初始模組化版本
- 基於原 `index.html` 分離物件功能
- 保持所有原有功能和設計
