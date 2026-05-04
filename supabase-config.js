// ============================================
// Supabase 統一配置檔案（僅供本專案使用）
// ============================================
// 專案：濬瑒物件網站 / junyang666
// 此 Supabase 專案請勿與其他應用程式共用，以確保資料庫隔離。
// 詳見：Supabase-資料庫隔離與命名說明.md
// ============================================

const SUPABASE_CONFIG = {
    // Supabase 專案 URL
    url: 'https://cnzqtuuegdqwkgvletaa.supabase.co',
    
    // Supabase Anon/Public Key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE',
    
    // 預設配置選項（Supabase 僅暴露 public / graphql_public，未開放 junyang666 時請用 public）
    defaultOptions: {
        db: { schema: 'public' },
        auth: { persistSession: false },
        global: {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }
    }
};

// 預設相關連結資料（當 Supabase 無法連接時使用）
const DEFAULT_RELATED_LINKS = [
    {
        id: '09f06dfd-1fba-4911-953c-f9be80363df8',
        title: '更多物件資料',
        url: 'https://realtor.houseprice.tw/agent/buy/0928776755/',
        icon: '🏠',
        color_gradient: 'linear-gradient(45deg, #2ecc71, #27ae60)',
        display_order: 1,
        is_active: true,
        link_type: 'button'
    },
    {
        id: '79abfd24-22c0-470c-9737-6d9bf6b0f110',
        title: 'TikTok短影音',
        url: 'https://www.tiktok.com/@aihouse168',
        icon: '🎵',
        color_gradient: 'linear-gradient(45deg, #000000, #333333)',
        display_order: 2,
        is_active: false,
        link_type: 'button'
    },
    {
        id: '0b7ba83a-66be-4afb-8d73-38fcf86e1b62',
        title: '房產比價試算',
        url: 'https://housepice.pages.dev/%E4%B8%89%E5%90%88%E4%B8%80%E6%88%BF%E5%83%B9%E6%99%AE%E7%89%B9%E7%B5%B2',
        icon: '🧮',
        color_gradient: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
        display_order: 3,
        is_active: true,
        link_type: 'button'
    },
    {
        id: 'ec5964bf-a1f0-48d2-95bf-99e527b96ea0',
        title: '預售團購區',
        url: 'https://salersteam.pages.dev/junyang',
        icon: '🏢',
        color_gradient: 'linear-gradient(45deg, #9b59b6, #8e44ad)',
        display_order: 4,
        is_active: false,
        link_type: 'button'
    },
    {
        id: '7b7a3dfa-f335-4571-a365-e5b232134257',
        title: '楊梅生活集',
        url: 'https://liff.line.me/2008363788-4Ly1Bv0r',
        icon: '📰',
        color_gradient: 'linear-gradient(45deg, #f9a825, #ff9800)',
        display_order: 5,
        is_active: true,
        link_type: 'button'
    },
    {
        id: '7654d782-c10a-4abc-af35-32ec3fa0975c',
        title: '房產資訊參考',
        url: '#',
        icon: '📊',
        color_gradient: 'linear-gradient(45deg, #667eea, #764ba2)',
        display_order: 6,
        is_active: true,
        link_type: 'dropdown',
        items: [
            {
                id: '0af0e9d3-bef8-42ce-be4c-5a0ec7fe9063',
                parent_link_id: '7654d782-c10a-4abc-af35-32ec3fa0975c',
                title: '2026年楊梅趨勢引擊',
                url: 'https://drive.google.com/file/d/1NddGgXcysK-QRoozRA4XXww6c-NUv-OJ/view?usp=sharing',
                display_order: 1,
                is_active: true
            },
            {
                id: 'ddaa0085-53c5-4314-a6a5-407419615009',
                parent_link_id: '7654d782-c10a-4abc-af35-32ec3fa0975c',
                title: '新青安寬鬆政策',
                url: 'https://drive.google.com/file/d/1PeGDx2IruOjWkeIHgVVqpk0tceB0l7Vg/view?usp=drive_link',
                display_order: 2,
                is_active: true
            },
            {
                id: 'a817158f-81cd-4ebb-9270-9eb890074a96',
                parent_link_id: '7654d782-c10a-4abc-af35-32ec3fa0975c',
                title: '2025年房產分析',
                url: 'https://drive.google.com/file/d/1vVluYlY81Ew76Dc4ZyWI_Y9CZ3cWbj0t/view?usp=drive_link',
                display_order: 3,
                is_active: true
            }
        ]
    }
];

// 初始化 Supabase 客戶端的統一函數
function createSupabaseClient(customOptions = {}) {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 尚未載入');
        return null;
    }
    
    const defaults = SUPABASE_CONFIG.defaultOptions || {};
    const options = {
        ...defaults,
        ...customOptions,
        global: {
            ...(defaults.global || {}),
            ...(customOptions.global || {}),
            headers: {
                ...(defaults.global && defaults.global.headers ? defaults.global.headers : {}),
                ...(customOptions.global && customOptions.global.headers ? customOptions.global.headers : {})
            }
        }
    };
    
    try {
        const client = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            options
        );
        console.log('✅ Supabase 客戶端創建成功');
        return client;
    } catch (error) {
        console.error('❌ Supabase 客戶端創建失敗:', error);
        return null;
    }
}

// 暴露到全域
if (typeof window !== 'undefined') {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.DEFAULT_RELATED_LINKS = DEFAULT_RELATED_LINKS;
    window.createSupabaseClient = createSupabaseClient;
    
    // 為了向後兼容，也暴露舊的變數名
    window.SUPABASE_URL = SUPABASE_CONFIG.url;
    window.SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;
}

// 如果是 Node.js 環境（用於測試腳本）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        DEFAULT_RELATED_LINKS,
        createSupabaseClient
    };
}
