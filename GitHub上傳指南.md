# 📤 上傳專案到 GitHub 操作指南

## ⚠️ 當前狀況
由於 Git 鎖定檔案問題，需要手動完成設定。

## 🔧 解決步驟

### 步驟 1：關閉所有 Git 相關進程
1. 開啟「工作管理員」(Ctrl + Shift + Esc)
2. 找到並結束所有 `git.exe` 進程
3. 關閉所有與專案相關的編輯器（VS Code、Cursor 等）

### 步驟 2：清理錯誤的 Git 倉庫
開啟**命令提示字元**（以系統管理員身分執行），執行：

```cmd
cd C:\Users\user
rmdir /s /q .git
```

### 步驟 3：進入專案目錄
```cmd
cd "C:\Users\user\Dropbox\我的電腦 (LAPTOP-784MRUC9)\Desktop\模組化"
```

### 步驟 4：刪除專案中的舊 Git（如果存在）
```cmd
if exist .git rmdir /s /q .git
```

### 步驟 5：初始化新的 Git 倉庫
```cmd
git init
```

### 步驟 6：添加遠端倉庫
```cmd
git remote add origin https://github.com/sky770825/junyang666.git
```

### 步驟 7：添加檔案到 Git
```cmd
git add .gitignore
git add *.html
git add *.js
git add *.md
git add images/
```

### 步驟 8：確認將要提交的檔案
```cmd
git status
```

### 步驟 9：提交變更
```cmd
git commit -m "更新專案：模組化版本"
```

### 步驟 10：設定主分支
```cmd
git branch -M main
```

### 步驟 11：推送到 GitHub

**如果是第一次推送（會覆蓋遠端倉庫）：**
```cmd
git push -u origin main --force
```

**如果遠端已有內容且想保留：**
```cmd
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 🎯 快速版（一次執行所有命令）

複製以下內容到**命令提示字元**：

```cmd
@echo off
cd "C:\Users\user\Dropbox\我的電腦 (LAPTOP-784MRUC9)\Desktop\模組化"
if exist .git rmdir /s /q .git
git init
git remote add origin https://github.com/sky770825/junyang666.git
git add .gitignore
git add *.html
git add *.js
git add *.md
git add images/
git commit -m "更新專案：模組化版本"
git branch -M main
git push -u origin main --force
echo.
echo ✅ 上傳完成！
pause
```

---

## 📝 注意事項

1. **備份資料夾**：`版本/` 資料夾已被 `.gitignore` 排除，不會上傳
2. **圖片檔案**：`images/` 資料夾中的所有圖片會被上傳
3. **敏感資訊**：確保沒有密碼或敏感資訊在程式碼中

---

## 🔍 驗證上傳成功

上傳完成後，訪問以下網址確認：
- **GitHub 倉庫**：https://github.com/sky770825/junyang666
- **GitHub Pages**：https://sky770825.github.io/junyang666/

---

## ❓ 常見問題

### Q: 出現 "Permission denied" 錯誤
**A:** 需要設定 GitHub 身分驗證。建議使用 Personal Access Token：
1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. 勾選 `repo` 權限
3. 複製 token
4. 推送時使用：`https://YOUR_TOKEN@github.com/sky770825/junyang666.git`

### Q: 檔案太大無法上傳
**A:** GitHub 單檔限制 100MB。如有大檔案，考慮使用 Git LFS 或移除該檔案。

### Q: 想要更新檔案
**A:** 
```cmd
cd "C:\Users\user\Dropbox\我的電腦 (LAPTOP-784MRUC9)\Desktop\模組化"
git add .
git commit -m "更新說明"
git push origin main
```

