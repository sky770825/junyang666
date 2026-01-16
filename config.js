// 環境配置檔案
// 可以在這裡設定不同環境的 API URL

const CONFIG = {
    // 開發環境（本地）
    development: {
        apiUrl: 'http://localhost:3000/api',
        uploadUrl: 'http://localhost:3000/api/upload'
    },
    
    // 生產環境（部署後）
    production: {
        // 選項 1：後端在同一個網域下
        // apiUrl: window.location.origin + '/api',
        
        // 選項 2：後端在不同的子網域（例如 api.yourdomain.com）
        // apiUrl: 'https://api.yourdomain.com/api',
        
        // 選項 3：後端在完全不同的網域
        // apiUrl: 'https://your-backend-server.com/api',
        
        // 預設：自動偵測（使用當前網域 + /api）
        apiUrl: window.location.origin + '/api',
        uploadUrl: window.location.origin + '/api/upload'
    }
};

// 自動判斷環境
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';

// 當前環境配置
const currentConfig = isDevelopment ? CONFIG.development : CONFIG.production;

// 匯出當前配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, currentConfig };
}

// 在全域暴露配置（供其他腳本使用）
window.APP_CONFIG = currentConfig;
