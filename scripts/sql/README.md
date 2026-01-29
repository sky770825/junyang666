# SQL 腳本（Supabase 資料庫）

此資料夾為 Supabase 資料庫的結構與遷移腳本，需在 **Supabase Dashboard → SQL Editor** 中手動執行。

| 檔案 | 說明 |
|------|------|
| `supabase-setup.sql` | 初始資料表結構 |
| `add-*.sql` | 新增欄位或結構 |
| `fix-rls-policies.sql` | RLS 權限修正 |
| `create-related-links-table.sql` | 相關連結表 |

執行前請先備份或確認環境（開發/正式）。
