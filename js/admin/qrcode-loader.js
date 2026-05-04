// 嘗試載入 QRCode 函式庫，使用多個備用 CDN（從 admin-dashboard 抽出）
(function() {
    const cdnUrls = [
        'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
    ];
    
    let currentIndex = 0;
    
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                console.log('✅ QRCode 函式庫已從', url, '載入');
                resolve();
            };
            script.onerror = () => {
                console.warn('❌ 無法從', url, '載入 QRCode 函式庫');
                reject();
            };
            document.head.appendChild(script);
        });
    }
    
    function tryLoadNext() {
        if (currentIndex >= cdnUrls.length) {
            console.error('❌ 所有 QRCode CDN 都載入失敗');
            return;
        }
        
        loadScript(cdnUrls[currentIndex])
            .then(() => {
                if (typeof QRCode === 'undefined') {
                    console.warn('⚠️ QRCode 函式庫載入但全域變數不存在，嘗試下一個 CDN');
                    currentIndex++;
                    tryLoadNext();
                } else {
                    console.log('✅ QRCode 函式庫已準備就緒');
                }
            })
            .catch(() => {
                currentIndex++;
                tryLoadNext();
            });
    }
    
    tryLoadNext();
})();
