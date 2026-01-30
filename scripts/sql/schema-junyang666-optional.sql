-- ============================================
-- 可選：建立專案專用 Schema（junyang666）
-- ============================================
-- 用途：若希望與同 Supabase 專案內其他應用完全隔離，
--       可建立此 schema，並將本專案所有表建於此 schema 下。
-- 使用前請先閱讀：Supabase-資料庫隔離與命名說明.md
--
-- 使用方式：
-- 1. 在 Supabase SQL Editor 執行此檔（建立 schema）。
-- 2. 其餘建表 SQL 需改為在 junyang666 下建表，例如：
--    CREATE TABLE junyang666.properties (...);
-- 3. 在 supabase-config.js 的 defaultOptions 中設定：
--    db: { schema: 'junyang666' }
-- ============================================

CREATE SCHEMA IF NOT EXISTS junyang666;

-- 授予 anon / authenticated 角色使用此 schema 的權限（前端 API 必備）
GRANT USAGE ON SCHEMA junyang666 TO anon;
GRANT USAGE ON SCHEMA junyang666 TO authenticated;

-- 之後所有本專案的資料表都建立於 junyang666 下，例如：
-- CREATE TABLE junyang666.properties (...);
-- CREATE TABLE junyang666.related_links (...);
-- CREATE TABLE junyang666.related_link_items (...);
