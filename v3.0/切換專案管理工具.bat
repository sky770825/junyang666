@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title 餐開月行程表管理工具

:start
cls
echo.
echo 餐開月行程表管理工具
echo 版本 2.0 - 簡化版
echo.
echo 請選擇操作：
echo.
echo  檔案管理
echo  1. 快速上傳到 GitHub (推薦)
echo  2. 檢查檔案狀態
echo  3. 建立版本備份
echo.
echo  部署管理
echo  4. 部署指定版本
echo  5. 下架所有檔案
echo  6. 切換專案
echo.
echo  系統設定
echo  7. 初始化/連接 GitHub 倉庫
echo  8. 修復同步問題
echo  9. 檢查認證狀態
echo  10. 切換 GitHub 帳戶
echo.
echo  資訊查看
echo  11. 查看版本資訊
echo  0. 退出程式
echo.

set /p choice=選項 (0-11): 

REM 清理輸入，移除可能的空白字符
set choice=%choice: =%

if "%choice%"=="1" goto quick_upload
if "%choice%"=="2" goto check_files
if "%choice%"=="3" goto create_backup
if "%choice%"=="4" goto deploy_version
if "%choice%"=="5" goto cleanup_github
if "%choice%"=="6" goto switch_project
if "%choice%"=="7" goto init_git
if "%choice%"=="8" goto fix_sync
if "%choice%"=="9" goto check_auth
if "%choice%"=="10" goto switch_account
if "%choice%"=="11" goto show_info
if "%choice%"=="0" goto exit
echo.
echo [錯誤] 無效選項，請重新選擇
timeout /t 2 >nul
goto start

:quick_upload
cls
echo.
echo 快速上傳到 GitHub
echo.

REM 檢查Git狀態
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 沒有發現GitHub倉庫
    echo 請先使用「初始化/連接 GitHub 倉庫」功能
    echo.
    pause
    goto start
)

REM 顯示專案資訊
for /f "tokens=4,5 delims=/" %%i in ('git remote get-url origin') do (
    set current_user=%%i
    set current_repo=%%j
)
set current_repo=%current_repo:.git=%
echo [資訊] 當前專案：%current_user%/%current_repo%
echo.

echo [處理中] 正在上傳檔案...
echo.

echo 步驟1: 添加所有檔案...
git add .
if errorlevel 1 (
    echo [錯誤] 添加檔案失敗
    pause
    goto start
)
echo [成功] 檔案已添加

echo.
echo 步驟2: 提交變更...
set commit_msg=更新餐開月行程表 - %date% %time%
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo [警告]  提交失敗（可能沒有變更需要提交）
    echo 直接嘗試推送...
    goto push_only
)
echo [成功] 變更已提交

:push_only
echo.
echo 步驟3: 推送到GitHub...
git push origin main
if errorlevel 1 (
    echo [錯誤] 推送到main失敗，嘗試master分支...
    git push origin master
    if errorlevel 1 (
        echo [錯誤] 推送失敗
        echo 可能原因：網路連接問題或GitHub認證問題
        pause
        goto start
    ) else (
        echo [成功] 已推送到master分支
        goto upload_success
    )
) else (
    echo [成功] 已推送到main分支
    goto upload_success
)

:upload_success
echo.
echo 上傳完成！
echo.
echo [網站] 您的網站地址：
echo %current_user%.github.io/%current_repo%
echo.
pause
goto start

:show_changes
echo.
echo [資訊] 變更內容：
git status --short
echo.
echo 詳細變更：
git diff --stat
echo.
pause
goto quick_upload

:force_push_upload
echo.
echo [警告]  嘗試強制推送...
echo 注意：強制推送會覆蓋遠端的變更！
echo.
set /p force_confirm=強制推送？會覆蓋遠端變更！(y/n): 
if /i not "%force_confirm%"=="y" (
    echo 操作已取消
    pause
    goto start
)

git push origin main --force
if errorlevel 1 (
    git push origin master --force
    if errorlevel 1 (
        echo [錯誤] 強制推送也失敗
        echo 可能原因：認證問題或網路問題
        pause
        goto start
    ) else (
        echo [成功] 已強制推送到master分支
        goto upload_success
    )
) else (
    echo [成功] 已強制推送到main分支
    goto upload_success
)

:check_files
cls
echo.
echo 檢查檔案狀態
echo.

echo [資料夾] 本地檔案列表：
dir /b *.html *.css *.js *.json *.md 2>nul

echo.
echo [狀態] Git狀態：
git status --short

echo.
echo [網站] GitHub狀態：
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 未連接GitHub倉庫
) else (
    echo [成功] 已連接GitHub倉庫
    for /f "tokens=4,5 delims=/" %%i in ('git remote get-url origin') do (
        set current_user=%%i
        set current_repo=%%j
    )
    set current_repo=%current_repo:.git=%
    echo [資訊] 倉庫：%current_user%/%current_repo%
)

echo.
pause
goto start

:create_backup
cls
echo.
echo 建立版本備份
echo.

set /p version=版本號 (如 v2.1): 

if "%version%"=="" (
    echo [錯誤] 版本號不能為空！
    pause
    goto start
)

echo.
echo 正在建立 %version% 資料夾...
mkdir %version% 2>nul

echo 正在複製檔案...
echo 步驟1: 複製主要網站檔案...
copy index.html %version%\ 2>nul
copy script.js %version%\ 2>nul
copy style.css %version%\ 2>nul
copy data.json %version%\ 2>nul
copy admin.html %version%\ 2>nul
copy admin.css %version%\ 2>nul
copy admin.js %version%\ 2>nul

echo 步驟2: 複製管理工具檔案...
copy "切換專案管理工具.bat" %version%\ 2>nul
copy "通用github管理工具.bat" %version%\ 2>nul
copy "GitHub管理工具.bat" %version%\ 2>nul

echo 步驟3: 複製設定和配置檔案...
copy github_accounts.json %version%\ 2>nul
copy github_projects.json %version%\ 2>nul
copy project-config.js %version%\ 2>nul

echo 步驟4: 複製同步和更新相關檔案...
copy github-sync.js %version%\ 2>nul
copy update-checker.js %version%\ 2>nul
copy auto-setup-token.js %version%\ 2>nul

echo 步驟5: 複製測試檔案...
copy admin-debug.html %version%\ 2>nul
copy admin-test.html %version%\ 2>nul
copy data-loading-test.html %version%\ 2>nul
copy data-sync-test.html %version%\ 2>nul
copy editing-state-test.html %version%\ 2>nul
copy sync-test.html %version%\ 2>nul
copy test-data-loading.html %version%\ 2>nul
copy tablet_*.html %version%\ 2>nul

echo 步驟6: 複製Token設定檔案...
copy setup-github-token.html %version%\ 2>nul
copy simple-token-setup.html %version%\ 2>nul
copy secure-token-setup.html %version%\ 2>nul
copy token-setup.html %version%\ 2>nul
copy token-test.html %version%\ 2>nul
copy token-manager.html %version%\ 2>nul
copy token-guide.html %version%\ 2>nul
copy quick-token-update.html %version%\ 2>nul
copy update-token.html %version%\ 2>nul

echo 步驟7: 複製其他工具檔案...
copy clear-cache.html %version%\ 2>nul

echo 步驟8: 複製說明文件...
copy *.md %version%\ 2>nul
copy responsive_guide.md %version%\ 2>nul
copy "GitHub_專案切換說明.md" %version%\ 2>nul

echo 步驟9: 複製所有HTML檔案（確保不遺漏）...
copy *.html %version%\ 2>nul

echo 步驟10: 複製所有JS檔案（確保不遺漏）...
copy *.js %version%\ 2>nul

echo 步驟11: 複製所有JSON檔案（確保不遺漏）...
copy *.json %version%\ 2>nul

echo 步驟12: 複製所有BAT檔案（確保不遺漏）...
copy *.bat %version%\ 2>nul

echo 步驟13: 複製所有CSS檔案（確保不遺漏）...
copy *.css %version%\ 2>nul

echo 步驟14: 複製所有圖片檔案（確保不遺漏）...
copy *.jpg %version%\ 2>nul
copy *.jpeg %version%\ 2>nul
copy *.png %version%\ 2>nul
copy *.gif %version%\ 2>nul
copy *.bmp %version%\ 2>nul
copy *.svg %version%\ 2>nul
copy *.ico %version%\ 2>nul

echo 步驟15: 複製所有字體檔案（確保不遺漏）...
copy *.ttf %version%\ 2>nul
copy *.otf %version%\ 2>nul
copy *.woff %version%\ 2>nul
copy *.woff2 %version%\ 2>nul

echo 步驟16: 複製所有其他檔案（確保不遺漏）...
copy *.txt %version%\ 2>nul
copy *.xml %version%\ 2>nul
copy *.yml %version%\ 2>nul
copy *.yaml %version%\ 2>nul
copy *.ini %version%\ 2>nul
copy *.conf %version%\ 2>nul
copy *.config %version%\ 2>nul

echo 步驟17: 複製所有資料夾（確保不遺漏）...
xcopy /E /I /Y v* %version%\v* 2>nul
xcopy /E /I /Y backup* %version%\backup* 2>nul
xcopy /E /I /Y test* %version%\test* 2>nul
xcopy /E /I /Y docs* %version%\docs* 2>nul
xcopy /E /I /Y assets* %version%\assets* 2>nul
xcopy /E /I /Y images* %version%\images* 2>nul
xcopy /E /I /Y css* %version%\css* 2>nul
xcopy /E /I /Y js* %version%\js* 2>nul

echo.
echo [成功] 版本備份完成！
echo [資料夾] 備份位置：%version% 資料夾
echo.
echo [資訊] 備份內容包含：
echo [檔案] 主要網站檔案：index.html, script.js, style.css, data.json
echo [管理頁面] 管理頁面：admin.html, admin.css, admin.js
echo [管理工具] 管理工具：切換專案管理工具.bat, 通用github管理工具.bat
echo [設定] 設定檔案：github_accounts.json, github_projects.json
echo [處理中] 同步工具：github-sync.js, update-checker.js
echo [測試] 測試檔案：admin-test.html, data-loading-test.html 等
echo [Token] Token工具：所有Token相關HTML檔案
echo [說明] 說明文件：所有*.md 檔案
echo [樣式] CSS檔案：所有*.css 檔案
echo [圖片] 圖片檔案：所有*.jpg, *.png, *.gif, *.svg 等
echo [字體] 字體檔案：所有*.ttf, *.otf, *.woff, *.woff2 等
echo [配置] 配置檔案：所有*.txt, *.xml, *.yml, *.ini 等
echo [資料夾] 子資料夾：所有v*、backup*、test*、docs* 等資料夾
echo [工具] 其他工具：所有HTML、JS、JSON、BAT檔案
echo.

set /p deploy_now=立即部署此版本？(y/n): 
if /i "%deploy_now%"=="y" (
    echo 正在部署版本 %version%...
    goto deploy_version
)

echo.
pause
goto start

:deploy_version
cls
echo.
echo 部署指定版本
echo.

echo 可用的版本：
dir /b | findstr "^v" 2>nul
if errorlevel 1 (
    echo [錯誤] 沒有找到版本資料夾！
    echo 請先使用「建立版本備份」功能
    echo.
    pause
    goto start
)

echo.
set /p version=要部署的版本號: 

if "%version%"=="" (
    echo [錯誤] 版本號不能為空！
    pause
    goto start
)

if not exist "%version%" (
    echo [錯誤] 版本資料夾不存在：%version%
    echo 可用的版本：
    dir /b | findstr "^v"
    echo.
    pause
    goto start
)

echo.
echo [部署] 正在部署版本：%version%
echo.

REM 檢查版本資料夾內容
if not exist "%version%\index.html" (
    echo [錯誤] 版本資料夾缺少 index.html 檔案
    pause
    goto start
)
if not exist "%version%\script.js" (
    echo [錯誤] 版本資料夾缺少 script.js 檔案
    pause
    goto start
)
echo [成功] 版本資料夾內容檢查通過

echo.
echo 步驟1: 備份當前檔案...
if not exist "backup_current" mkdir backup_current
copy *.html backup_current\ 2>nul
copy *.css backup_current\ 2>nul
copy *.js backup_current\ 2>nul
copy *.json backup_current\ 2>nul
copy *.md backup_current\ 2>nul
copy *.bat backup_current\ 2>nul
copy *.jpg backup_current\ 2>nul
copy *.jpeg backup_current\ 2>nul
copy *.png backup_current\ 2>nul
copy *.gif backup_current\ 2>nul
copy *.bmp backup_current\ 2>nul
copy *.svg backup_current\ 2>nul
copy *.ico backup_current\ 2>nul
copy *.ttf backup_current\ 2>nul
copy *.otf backup_current\ 2>nul
copy *.woff backup_current\ 2>nul
copy *.woff2 backup_current\ 2>nul
copy *.txt backup_current\ 2>nul
copy *.xml backup_current\ 2>nul
copy *.yml backup_current\ 2>nul
copy *.yaml backup_current\ 2>nul
copy *.ini backup_current\ 2>nul
copy *.conf backup_current\ 2>nul
copy *.config backup_current\ 2>nul
xcopy /E /I /Y v* backup_current\v* 2>nul
xcopy /E /I /Y backup* backup_current\backup* 2>nul
xcopy /E /I /Y test* backup_current\test* 2>nul
xcopy /E /I /Y docs* backup_current\docs* 2>nul
xcopy /E /I /Y assets* backup_current\assets* 2>nul
xcopy /E /I /Y images* backup_current\images* 2>nul
xcopy /E /I /Y css* backup_current\css* 2>nul
xcopy /E /I /Y js* backup_current\js* 2>nul
echo [成功] 當前檔案已備份

echo.
echo 步驟2: 複製版本檔案...
copy "%version%\*" . 2>nul
echo [成功] 版本檔案已複製

echo.
echo 步驟3: 上傳到GitHub...
git add .
if errorlevel 1 (
    echo [錯誤] 添加檔案失敗
    pause
    goto start
)
echo [成功] 檔案已添加

git commit -m "部署版本 %version% - %date% %time%"
if errorlevel 1 (
    echo [錯誤] 提交失敗，嘗試強制推送...
    goto force_push
)
echo [成功] 變更已提交

git push origin main
if errorlevel 1 (
    echo [錯誤] 推送到main失敗，嘗試master分支...
    git push origin master
    if errorlevel 1 (
        echo [錯誤] 推送失敗，嘗試強制推送...
        goto force_push
    ) else (
        echo [成功] 已推送到master分支
        goto deploy_success
    )
) else (
    echo [成功] 已推送到main分支
    goto deploy_success
)

:force_push
echo.
echo [警告]  嘗試強制推送...
set /p force_confirm=強制推送？(y/n): 
if /i not "%force_confirm%"=="y" (
    echo 操作已取消
    pause
    goto start
)

git push origin main --force
if errorlevel 1 (
    git push origin master --force
    if errorlevel 1 (
        echo [錯誤] 強制推送也失敗
        pause
        goto start
    ) else (
        echo [成功] 已強制推送到master分支
        goto deploy_success
    )
) else (
    echo [成功] 已強制推送到main分支
    goto deploy_success
)

:deploy_success
echo.
echo [完成] 部署完成！
echo.
echo [資訊] 部署資訊：
echo 版本：%version%
echo 時間：%date% %time%
echo.
pause
goto start

:cleanup_github
cls
echo.
echo 下架所有檔案
echo.

echo [警告]  警告：這將刪除GitHub上的所有檔案！
echo.
echo 下架後的效果：
echo - GitHub Repository 會變成空白
echo - 網站會無法顯示
echo - 所有檔案都會被移除
echo.
echo 建議先建立備份！
echo.

echo 操作選項：
echo 1. 先備份再下架（推薦）
echo 2. 直接下架（危險）
echo 0. 取消操作
echo.

set /p cleanup_choice=操作 (0-2): 

if "%cleanup_choice%"=="0" goto start
if "%cleanup_choice%"=="1" goto backup_and_cleanup
if "%cleanup_choice%"=="2" goto direct_cleanup

echo [錯誤] 無效選項，請重新選擇
timeout /t 2 >nul
goto cleanup_github

:backup_and_cleanup
echo.
echo [備份] 正在建立緊急備份...
if not exist "backup_emergency" mkdir backup_emergency
copy *.html backup_emergency\ 2>nul
copy *.css backup_emergency\ 2>nul
copy *.js backup_emergency\ 2>nul
copy *.json backup_emergency\ 2>nul
copy *.md backup_emergency\ 2>nul
copy *.bat backup_emergency\ 2>nul
copy *.jpg backup_emergency\ 2>nul
copy *.jpeg backup_emergency\ 2>nul
copy *.png backup_emergency\ 2>nul
copy *.gif backup_emergency\ 2>nul
copy *.bmp backup_emergency\ 2>nul
copy *.svg backup_emergency\ 2>nul
copy *.ico backup_emergency\ 2>nul
copy *.ttf backup_emergency\ 2>nul
copy *.otf backup_emergency\ 2>nul
copy *.woff backup_emergency\ 2>nul
copy *.woff2 backup_emergency\ 2>nul
copy *.txt backup_emergency\ 2>nul
copy *.xml backup_emergency\ 2>nul
copy *.yml backup_emergency\ 2>nul
copy *.yaml backup_emergency\ 2>nul
copy *.ini backup_emergency\ 2>nul
copy *.conf backup_emergency\ 2>nul
copy *.config backup_emergency\ 2>nul
xcopy /E /I /Y v* backup_emergency\v* 2>nul
xcopy /E /I /Y backup* backup_emergency\backup* 2>nul
xcopy /E /I /Y test* backup_emergency\test* 2>nul
xcopy /E /I /Y docs* backup_emergency\docs* 2>nul
xcopy /E /I /Y assets* backup_emergency\assets* 2>nul
xcopy /E /I /Y images* backup_emergency\images* 2>nul
xcopy /E /I /Y css* backup_emergency\css* 2>nul
xcopy /E /I /Y js* backup_emergency\js* 2>nul
echo [成功] 緊急備份已建立：backup_emergency 資料夾

echo.
set /p confirm=備份完成，確定要下架所有檔案嗎？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    goto start
)

goto perform_cleanup

:direct_cleanup
echo.
echo [警告]  最後警告：這將永久刪除所有檔案！
echo 建議您先手動備份重要檔案
echo.
set /p confirm=下架所有檔案？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    goto start
)

:perform_cleanup
echo.
echo 正在下架檔案...
git rm -r --cached .
git commit -m "下架所有檔案 - %date% %time%"

echo.
echo 正在推送到GitHub...
git push origin main
if errorlevel 1 (
    echo [錯誤] 推送到main失敗，檢查原因...
    echo 可能原因：遠端有新的提交
    echo 正在嘗試同步...
    echo.
    
    echo 步驟1: 獲取遠端變更...
    git fetch origin
    if errorlevel 1 (
        echo [錯誤] 獲取遠端變更失敗
        echo 嘗試推送到master分支...
        goto try_master_cleanup
    )
    
    echo 步驟2: 合併遠端變更...
    git merge origin/main
    if errorlevel 1 (
        echo [錯誤] 合併衝突！需要手動解決
        echo 建議使用「修復同步問題」功能
        pause
        goto start
    )
    
    echo 步驟3: 重新推送下架變更...
    git push origin main
    if errorlevel 1 (
        echo [錯誤] 重新推送失敗，嘗試master分支...
        goto try_master_cleanup
    ) else (
        echo [成功] 已成功下架到main分支
        goto cleanup_success
    )
    
    :try_master_cleanup
    echo 嘗試推送到master分支...
    git push origin master
    if errorlevel 1 (
        echo [錯誤] 下架失敗
        echo 可能原因：認證問題或網路問題
        echo 建議使用「修復同步問題」功能
        pause
        goto start
    ) else (
        echo [成功] 已下架到master分支
        goto cleanup_success
    )
) else (
    echo [成功] 已下架到main分支
    goto cleanup_success
)

:cleanup_success
echo.
echo [成功] 下架完成！
echo.
if exist "backup_emergency" (
    echo [資料夾] 緊急備份位於：backup_emergency 資料夾
)
echo.
pause
goto start

:init_git
cls
echo.
echo 初始化/連接 GitHub 倉庫
echo.

REM 檢查是否已有Git倉庫
if exist ".git" (
    echo [警告]  警告：檢測到現有的Git倉庫！
    echo.
    echo 當前配置：
    git config --get user.name 2>nul
    git config --get user.email 2>nul
    git remote get-url origin 2>nul
    echo.
    echo 操作選項：
    echo 1. 重新配置現有倉庫（會覆蓋現有設定）
    echo 2. 添加新的遠端倉庫
    echo 3. 備份現有設定後重新初始化
    echo 0. 取消操作
    echo.
    
    set /p init_choice=操作 (0-3): 
    
    if "%init_choice%"=="0" goto start
    if "%init_choice%"=="1" goto reconfigure_existing
    if "%init_choice%"=="2" goto add_new_remote
    if "%init_choice%"=="3" goto backup_and_reinit
    
    echo [錯誤] 無效選項，請重新選擇
    timeout /t 2 >nul
    goto init_git
)

:new_init
echo 請輸入您的 GitHub 倉庫連結：
echo 範例：https://github.com/username/repository-name
echo.
set /p repo_url=GitHub 連結: 

if "%repo_url%"=="" (
    echo [錯誤] 連結不能為空！
    pause
    goto start
)

echo.
echo 正在驗證連結格式...
echo %repo_url% | findstr "github.com" >nul
if errorlevel 1 (
    echo [錯誤] 無效的 GitHub 連結格式
    pause
    goto start
)

echo [成功] 連結格式正確

echo.
echo 正在處理 URL 格式...
if "%repo_url:~-4%"==".git" (
    echo [成功] URL 已包含 .git 後綴
) else (
    set repo_url=%repo_url%.git
    echo [成功] 已自動添加 .git 後綴
)

echo.
echo 正在初始化 Git 倉庫...
git init
git remote add origin %repo_url%
git config user.name "餐開月行程表管理工具"
git config user.email "admin@example.com"

echo.
echo 正在添加檔案...
git add .
git commit -m "初始化餐開月行程表 - %date% %time%"

echo.
echo 正在推送到 GitHub...
git push -u origin main
if errorlevel 1 (
    git push -u origin master
    if errorlevel 1 (
        echo [錯誤] 推送失敗
        echo 請檢查網路連接和倉庫權限
        pause
        goto start
    )
)

echo.
echo 初始化完成！
echo.
echo [網站] 您的網站地址：
echo %repo_url:~0,-4%.github.io/%repo_url:~19%
echo.
pause
goto start

:reconfigure_existing
echo.
echo [警告]  警告：這將覆蓋現有的Git配置！
echo.
set /p confirm=重新配置？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    goto init_git
)

echo.
echo 請輸入新的 GitHub 倉庫連結：
set /p repo_url=GitHub 連結: 

if "%repo_url%"=="" (
    echo [錯誤] 連結不能為空！
    pause
    goto init_git
)

echo.
echo 正在重新配置...
git remote remove origin
git remote add origin %repo_url%
echo [成功] 已重新配置遠端倉庫
echo.
pause
goto start

:add_new_remote
echo.
echo 請輸入新的遠端倉庫名稱（預設：backup）：
set /p remote_name=遠端名稱: 
if "%remote_name%"=="" set remote_name=backup

echo.
echo 請輸入新的 GitHub 倉庫連結：
set /p repo_url=GitHub 連結: 

if "%repo_url%"=="" (
    echo [錯誤] 連結不能為空！
    pause
    goto init_git
)

echo.
echo 正在添加新的遠端倉庫...
git remote add %remote_name% %repo_url%
echo [成功] 已添加遠端倉庫：%remote_name%
echo.
pause
goto start

:backup_and_reinit
echo.
echo [備份] 正在備份現有配置...
if not exist "backup_git_config" mkdir backup_git_config
git config --list > backup_git_config\git_config_backup.txt 2>nul
git remote -v > backup_git_config\remote_backup.txt 2>nul
echo [成功] 配置已備份到：backup_git_config 資料夾

echo.
echo 請輸入新的 GitHub 倉庫連結：
set /p repo_url=GitHub 連結: 

if "%repo_url%"=="" (
    echo [錯誤] 連結不能為空！
    pause
    goto init_git
)

echo.
echo 正在重新初始化...
rmdir /s /q .git 2>nul
git init
git remote add origin %repo_url%
git config user.name "餐開月行程表管理工具"
git config user.email "admin@example.com"

echo.
echo 正在添加檔案...
git add .
git commit -m "重新初始化餐開月行程表 - %date% %time%"

echo.
echo 正在推送到 GitHub...
git push -u origin main
if errorlevel 1 (
    git push -u origin master
)

echo.
echo [成功] 重新初始化完成！
echo [資料夾] 原配置備份：backup_git_config 資料夾
echo.
pause
goto start

:fix_sync
cls
echo.
echo 修復同步問題
echo.

echo [警告]  警告：此操作可能會導致合併衝突！
echo.
echo 修復選項：
echo 1. 安全修復（推薦）- 先備份本地修改
echo 2. 強制同步 - 放棄本地修改，使用遠端版本
echo 3. 強制推送 - 放棄遠端修改，使用本地版本
echo 0. 返回主選單
echo.

set /p fix_choice=修復方式 (0-3): 

if "%fix_choice%"=="0" goto start
if "%fix_choice%"=="1" goto safe_fix
if "%fix_choice%"=="2" goto force_sync
if "%fix_choice%"=="3" goto force_push

echo [錯誤] 無效選項，請重新選擇
timeout /t 2 >nul
goto fix_sync

:safe_fix
echo.
echo [處理中] 正在執行安全修復...
echo.

echo 步驟1: 備份當前修改...
if not exist "backup_sync" mkdir backup_sync
copy *.html backup_sync\ 2>nul
copy *.css backup_sync\ 2>nul
copy *.js backup_sync\ 2>nul
copy *.json backup_sync\ 2>nul
copy *.md backup_sync\ 2>nul
copy *.bat backup_sync\ 2>nul
copy *.jpg backup_sync\ 2>nul
copy *.jpeg backup_sync\ 2>nul
copy *.png backup_sync\ 2>nul
copy *.gif backup_sync\ 2>nul
copy *.bmp backup_sync\ 2>nul
copy *.svg backup_sync\ 2>nul
copy *.ico backup_sync\ 2>nul
copy *.ttf backup_sync\ 2>nul
copy *.otf backup_sync\ 2>nul
copy *.woff backup_sync\ 2>nul
copy *.woff2 backup_sync\ 2>nul
copy *.txt backup_sync\ 2>nul
copy *.xml backup_sync\ 2>nul
copy *.yml backup_sync\ 2>nul
copy *.yaml backup_sync\ 2>nul
copy *.ini backup_sync\ 2>nul
copy *.conf backup_sync\ 2>nul
copy *.config backup_sync\ 2>nul
xcopy /E /I /Y v* backup_sync\v* 2>nul
xcopy /E /I /Y backup* backup_sync\backup* 2>nul
xcopy /E /I /Y test* backup_sync\test* 2>nul
xcopy /E /I /Y docs* backup_sync\docs* 2>nul
xcopy /E /I /Y assets* backup_sync\assets* 2>nul
xcopy /E /I /Y images* backup_sync\images* 2>nul
xcopy /E /I /Y css* backup_sync\css* 2>nul
xcopy /E /I /Y js* backup_sync\js* 2>nul
echo [成功] 已備份到 backup_sync 資料夾

echo.
echo 步驟2: 獲取遠端內容...
git fetch origin
if errorlevel 1 (
    echo [錯誤] 獲取遠端內容失敗
    pause
    goto start
)

echo.
echo 步驟3: 嘗試合併...
git merge origin/main
if errorlevel 1 (
    echo [錯誤] 合併衝突！請手動解決衝突後重新執行
    echo [資料夾] 備份檔案位於：backup_sync 資料夾
    pause
    goto start
)

echo [成功] 合併成功！

echo.
echo 步驟4: 推送到 GitHub...
git push origin main
if errorlevel 1 (
    git push origin master
)

echo.
echo [成功] 安全修復完成！
echo [資料夾] 備份檔案：backup_sync 資料夾
echo.
pause
goto start

:force_sync
echo.
echo [警告]  警告：這將放棄所有本地修改！
echo.
set /p confirm=放棄本地修改？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    goto fix_sync
)

echo.
echo [處理中] 正在強制同步到遠端版本...
git fetch origin
git reset --hard origin/main
echo [成功] 已強制同步到遠端版本
echo.
pause
goto start

:force_push
echo.
echo [警告]  警告：這將覆蓋遠端的所有修改！
echo.
set /p confirm=覆蓋遠端修改？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    goto fix_sync
)

echo.
echo [處理中] 正在強制推送本地修改...
git add .
git commit -m "強制推送本地修改 - %date% %time%"
git push origin main --force
if errorlevel 1 (
    git push origin master --force
)
echo [成功] 已強制推送本地修改
echo.
pause
goto start

:check_auth
cls
echo.
echo 檢查認證狀態
echo.

echo Git 用戶資訊：
git config --get user.name
git config --get user.email

echo.
echo 遠端倉庫：
git remote -v

echo.
echo 測試 GitHub 連接...
git ls-remote origin >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 無法連接到 GitHub
    echo 建議：檢查認證設定或使用 Personal Access Token
) else (
    echo [成功] GitHub 連接正常
)

echo.
pause
goto start

:switch_project
cls
echo.
echo 切換專案
echo.

echo [警告]  注意：切換專案會修改Git配置和遠端倉庫設定
echo [資料夾] 原配置會自動備份到 backup_project_config 資料夾
echo.

echo 可用的專案：
echo.
echo [資訊] sky770825 帳戶專案：
echo 1. 餐開月行程表 (niceshow) ⭐ 預設
echo 2. 功夫茶點餐系統 (kungfuteahtml)
echo 3. AI指令大全 (Aibot888)
echo 4. 美業共享工作室 (lady8888)
echo 5. Picehouse (picehouse)
echo 6. 華房地產 (Hua-Real-Estate)
echo 7. 房屋投票系統 (housepolltex)
echo 8. 餐車系統 (foodcar)
echo.
echo [資訊] 其他帳戶專案：
echo 9. 濬聯配件專用 (liny14705/nicehouse)
echo 10. 房子物件銷售 (liny14705/house0825)
echo 0. 返回主選單
echo.

set /p project_choice=要切換的專案 (0-10): 

if "%project_choice%"=="0" goto start
if "%project_choice%"=="1" goto switch_niceshow
if "%project_choice%"=="2" goto switch_kungfuteahtml
if "%project_choice%"=="3" goto switch_aibot888
if "%project_choice%"=="4" goto switch_lady8888
if "%project_choice%"=="5" goto switch_picehouse
if "%project_choice%"=="6" goto switch_hua_real_estate
if "%project_choice%"=="7" goto switch_housepolltex
if "%project_choice%"=="8" goto switch_foodcar
if "%project_choice%"=="9" goto switch_nicehouse
if "%project_choice%"=="10" goto switch_house0825

echo [錯誤] 無效選項，請重新選擇
timeout /t 2 >nul
goto switch_project

:switch_niceshow
echo.
echo [處理中] 正在切換到餐開月行程表專案...

REM 備份當前配置
if not exist "backup_project_config" mkdir backup_project_config
git config --get user.name > backup_project_config\current_user.txt 2>nul
git config --get user.email > backup_project_config\current_email.txt 2>nul
git remote get-url origin > backup_project_config\current_remote.txt 2>nul

git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/niceshow.git
echo [成功] 已切換到餐開月行程表專案
echo [網站] 網站：https://sky770825.github.io/niceshow
echo [資料夾] 原配置已備份到：backup_project_config 資料夾
echo.
pause
goto start

:switch_kungfuteahtml
echo.
echo [處理中] 正在切換到功夫茶點餐系統專案...

REM 備份當前配置
if not exist "backup_project_config" mkdir backup_project_config
git config --get user.name > backup_project_config\current_user.txt 2>nul
git config --get user.email > backup_project_config\current_email.txt 2>nul
git remote get-url origin > backup_project_config\current_remote.txt 2>nul

git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/kungfuteahtml.git
echo [成功] 已切換到功夫茶點餐系統專案
echo [網站] 網站：https://sky770825.github.io/kungfuteahtml
echo [資料夾] 原配置已備份到：backup_project_config 資料夾
echo.
pause
goto start

:switch_aibot888
echo.
echo [處理中] 正在切換到AI指令大全專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/Aibot888.git
echo [成功] 已切換到AI指令大全專案
echo [網站] 網站：https://sky770825.github.io/Aibot888
echo.
pause
goto start

:switch_lady8888
echo.
echo [處理中] 正在切換到美業共享工作室專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/lady8888.git
echo [成功] 已切換到美業共享工作室專案
echo [網站] 網站：https://sky770825.github.io/lady8888
echo.
pause
goto start

:switch_picehouse
echo.
echo [處理中] 正在切換到Picehouse專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/picehouse.git
echo [成功] 已切換到Picehouse專案
echo [網站] 網站：https://sky770825.github.io/picehouse
echo.
pause
goto start

:switch_hua_real_estate
echo.
echo [處理中] 正在切換到華房地產專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/Hua-Real-Estate.git
echo [成功] 已切換到華房地產專案
echo [網站] 網站：https://sky770825.github.io/Hua-Real-Estate
echo.
pause
goto start

:switch_housepolltex
echo.
echo [處理中] 正在切換到房屋投票系統專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/housepolltex.git
echo [成功] 已切換到房屋投票系統專案
echo [網站] 網站：https://sky770825.github.io/housepolltex
echo.
pause
goto start

:switch_foodcar
echo.
echo [處理中] 正在切換到餐車系統專案...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
git remote set-url origin https://github.com/sky770825/foodcar.git
echo [成功] 已切換到餐車系統專案
echo [網站] 網站：https://sky770825.github.io/foodcar
echo.
pause
goto start

:switch_nicehouse
echo.
echo [處理中] 正在切換到濬聯配件專用專案...
git config user.name "liny14705"
git config user.email "liny14705@gmail.com"
git remote set-url origin https://github.com/liny14705/nicehouse.git
echo [成功] 已切換到濬聯配件專用專案
echo [網站] 網站：https://liny14705.github.io/nicehouse
echo.
pause
goto start

:switch_house0825
echo.
echo [處理中] 正在切換到房子物件銷售專案...
git config user.name "liny14705"
git config user.email "liny14705@gmail.com"
git remote set-url origin https://github.com/liny14705/house0825.git
echo [成功] 已切換到房子物件銷售專案
echo [網站] 網站：https://liny14705.github.io/house0825
echo.
pause
goto start

:switch_account
cls
echo.
echo 切換 GitHub 帳戶
echo.

echo 可用的 GitHub 帳戶：
echo.
echo 1. sky770825 (sky19880825@gmail.com) - 獨立開發帳戶
echo 2. liny14705 (liny14705@gmail.com) - 獨立開發帳戶  
echo 3. chu20170103 (chu20170103@gmail.com) - 獨立開發帳戶
echo 0. 返回主選單
echo.

set /p account_choice=要切換的帳戶 (0-3): 

if "%account_choice%"=="0" goto start
if "%account_choice%"=="1" goto switch_sky770825
if "%account_choice%"=="2" goto switch_liny14705
if "%account_choice%"=="3" goto switch_chu20170103

echo [錯誤] 無效選項，請重新選擇
timeout /t 2 >nul
goto switch_account

:switch_sky770825
echo.
echo [處理中] 正在切換到 sky770825 帳戶...
git config user.name "sky770825"
git config user.email "sky19880825@gmail.com"
echo [成功] 已切換到 sky770825 帳戶
echo.
echo 請輸入 GitHub 倉庫 URL (例如: https://github.com/sky770825/niceshow.git):
set /p repo_url=倉庫 URL: 
if not "%repo_url%"=="" (
    git remote set-url origin %repo_url%
    echo [成功] 已設定遠端倉庫
)
echo.
pause
goto start

:switch_liny14705
echo.
echo [處理中] 正在切換到 liny14705 帳戶...
git config user.name "liny14705"
git config user.email "liny14705@gmail.com"
echo [成功] 已切換到 liny14705 帳戶
echo.
echo 請輸入 GitHub 倉庫 URL (例如: https://github.com/liny14705/nicehouse.git):
set /p repo_url=倉庫 URL: 
if not "%repo_url%"=="" (
    git remote set-url origin %repo_url%
    echo [成功] 已設定遠端倉庫
)
echo.
pause
goto start

:switch_chu20170103
echo.
echo [處理中] 正在切換到 chu20170103 帳戶...
git config user.name "chu20170103"
git config user.email "chu20170103@gmail.com"
echo [成功] 已切換到 chu20170103 帳戶
echo.
echo 請輸入 GitHub 倉庫 URL (例如: https://github.com/chu20170103/meal-schedule.git):
set /p repo_url=倉庫 URL: 
if not "%repo_url%"=="" (
    git remote set-url origin %repo_url%
    echo [成功] 已設定遠端倉庫
)
echo.
pause
goto start

:show_info
cls
echo.
echo 查看版本資訊
echo.
echo 本地版本：
dir /b | findstr "^v" 2>nul
echo.
echo Git 狀態：
git status --short
echo.
echo 最近提交記錄：
git log --oneline -5 2>nul
echo.
pause
goto start

:exit
cls
echo.
echo 感謝使用餐開月行程表管理工具！
echo.
echo [網站] 您的網站地址：
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=4,5 delims=/" %%i in ('git remote get-url origin') do (
        set current_user=%%i
        set current_repo=%%j
    )
    set current_repo=%current_repo:.git=%
    echo %current_user%.github.io/%current_repo%
) else (
    echo 無法取得倉庫資訊
)
echo.
echo 再見！👋
timeout /t 3 >nul
exit
