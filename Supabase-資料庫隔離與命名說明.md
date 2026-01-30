# Supabase 資料庫隔離與命名說明

> 本專案使用公用 Supabase 時，必須與其他專案完全隔離，並具備獨一無二的名稱識別。本文說明現況與建議作法。

---

## 一、現況說明

### 1. 目前使用的 Supabase 專案

| 項目 | 值 |
|------|-----|
| **專案 URL** | `https://cnzqtuuegdqwkgvletaa.supabase.co` |
| **專案識別（Project Ref）** | `cnzqtuuegdqwkgvletaa`（Supabase 自動產生，全球唯一） |
| **使用 Schema** | `public`（預設） |
| **資料表** | `properties`、`related_links`、`related_link_items` |

### 2. 隔離層級說明

- **一個 Supabase 專案 = 一個獨立資料庫**  
  不同專案之間資料完全隔離，不會混用。  
  因此「專案 `cnzqtuuegdqwkgvletaa`」本身就已經與其他 Supabase 專案隔離。

- **若同一個 Supabase 專案被多個應用共用**  
  才需要靠「Schema」或「資料表命名」再做一層隔離（見下方建議）。

---

## 二、必須遵守的兩點

### 1. 不可與其他專案的資料庫混在一起

- **做法**：本專案（子菲濬瑒物件網站 / junyang666）**專用一個 Supabase 專案**。
- **檢查**：
  - 在 [Supabase Dashboard](https://supabase.com/dashboard) 中，確認專案 `cnzqtuuegdqwkgvletaa` **只**給本網站使用。
  - 若有其他 side project 或測試站，應另建新專案，不要共用同一個 Project。

### 2. 必須有獨一無二的名稱

- **做法一（建議，無需改程式）**：在 Supabase 後台把專案「顯示名稱」設成專案專用、一看就懂，例如：
  - `junyang666`
  - `子菲濬瑒物件網站`
  - `junyang666-客製房屋網站`
- **做法二（進階）**：若要連「同專案內」都與其他應用區隔，可改用**自訂 Schema**，讓所有本專案的資料表都放在同一個 schema 下（例如 `junyang666`），名稱自然獨一無二（見下一節）。

---

## 三、進階：使用自訂 Schema 做名稱隔離（可選）

若未來有可能在同一個 Supabase 專案裡跑多個應用，建議為本專案建立專用 schema，例如 `junyang666`，所有表都建在該 schema 下。

### 1. 建立 Schema 與對應資料表

- 在 Supabase SQL Editor 執行：

```sql
-- 建立專案專用 schema（名稱獨一無二，不與其他應用混用）
CREATE SCHEMA IF NOT EXISTS junyang666;

-- 之後所有本專案的資料表都建立於 junyang666 下，例如：
-- CREATE TABLE junyang666.properties (...);
-- CREATE TABLE junyang666.related_links (...);
-- 詳見 scripts/sql/ 內各檔，需在表名前加上 junyang666.
```

- 現有表若已在 `public`，可依需求決定是否遷移到 `junyang666`（需遷移腳本與上線時程規劃）。

### 2. 程式端使用該 Schema

- 在 `supabase-config.js` 的 `defaultOptions` 中指定 schema：

```javascript
defaultOptions: {
    db: { schema: 'junyang666' },  // 使用自訂 schema
    auth: { persistSession: false }
}
```

- 查詢時即會使用 `junyang666.properties`、`junyang666.related_links` 等，不會與 `public` 或其他 schema 混在一起。

### 3. RLS 與權限

- 若啟用 RLS，Policy 需在 `junyang666` 下的表上設定。
- 權限需授予 `junyang666` schema 的 USAGE 與各表的 SELECT/INSERT/UPDATE/DELETE（依角色需求）。

---

## 四、檢查清單（公用資料庫必做）

- [ ] **專案專用**：此 Supabase 專案（Project Ref: `cnzqtuuegdqwkgvletaa`）僅供「子菲濬瑒物件網站 / junyang666」使用，未與其他專案或網站共用。
- [ ] **名稱唯一**：在 Supabase Dashboard 中，專案顯示名稱已設為易辨識的專用名稱（如 `junyang666` 或 `子菲濬瑒物件網站`）。
- [ ] **設定單一來源**：所有環境（本機、Cloudflare 等）的 Supabase URL / anon key 皆來自同一專案，且僅在 `supabase-config.js` 或環境變數中設定，不散落各檔案。
- [ ] **（可選）Schema 隔離**：若同專案會有多應用，已建立並使用自訂 schema（如 `junyang666`），且程式已改為使用該 schema。

---

## 五、相關檔案

| 檔案 | 說明 |
|------|------|
| `supabase-config.js` | 專案唯一 Supabase 設定來源；註明僅供本專案使用。 |
| `scripts/sql/supabase-setup.sql` | 建立 `properties` 等表（目前為 public schema）。 |
| `scripts/sql/create-related-links-table.sql` | 建立 `related_links`、`related_link_items`（目前為 public schema）。 |

若採用自訂 schema，需新增或調整 SQL 腳本，將表建立於 `junyang666` 下，並更新 RLS/權限與上述檢查清單。
