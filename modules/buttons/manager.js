// ============================================
// 功能按鈕管理模組
// ============================================
// 負責管理網站上的功能按鈕配置和顯示

(function() {
    'use strict';
    
    // 確保配置已載入
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('❌ SUPABASE_CONFIG 未載入，請先載入 supabase-config.js');
        return;
    }
    
    let supabaseClient = null;
    
    // 初始化 Supabase 客戶端
    function initClient() {
        if (!supabaseClient) {
            supabaseClient = createSupabaseClient({
                global: { headers: { 'x-client-info': 'buttons-manager' } }
            });
        }
        return supabaseClient;
    }
    
    // 預設功能按鈕配置
    const DEFAULT_BUTTONS = [
        {
            id: 'loan-calculator',
            title: '貸款試算',
            icon: '🧮',
            url: '#loan-calculator',
            type: 'modal',
            color: 'linear-gradient(45deg, #10b981, #3b82f6)',
            display_order: 1,
            is_active: true
        },
        {
            id: 'property-detail',
            title: '詳細資訊',
            icon: 'ℹ️',
            url: '#property-detail',
            type: 'link',
            color: 'linear-gradient(45deg, #667eea, #764ba2)',
            display_order: 2,
            is_active: true
        }
    ];
    
    // 載入功能按鈕配置
    async function loadButtons() {
        try {
            const client = initClient();
            if (!client) {
                console.warn('⚠️ 無法初始化 Supabase 客戶端，使用預設按鈕');
                return DEFAULT_BUTTONS;
            }
            
            // 從 Supabase 載入按鈕配置（如果未來需要）
            // 目前使用預設配置
            return DEFAULT_BUTTONS;
        } catch (error) {
            console.error('❌ 載入功能按鈕失敗:', error);
            return DEFAULT_BUTTONS;
        }
    }
    
    // 渲染功能按鈕
    function renderButtons(containerId, buttons) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ 找不到容器: ${containerId}`);
            return;
        }
        
        if (!buttons || buttons.length === 0) {
            buttons = DEFAULT_BUTTONS;
        }
        
        const activeButtons = buttons.filter(btn => btn.is_active !== false);
        
        container.innerHTML = activeButtons.map(btn => {
            if (btn.type === 'modal') {
                return `
                    <button data-action="${btn.id}" 
                            style="background: ${btn.color}; 
                                   color: white; 
                                   border: none; 
                                   padding: 0.6rem 1.2rem; 
                                   border-radius: 20px; 
                                   font-weight: 600; 
                                   cursor: pointer; 
                                   transition: all 0.3s ease; 
                                   box-shadow: 0 2px 8px rgba(0,0,0,0.2); 
                                   font-size: 1rem;"
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)'">
                        ${btn.icon || ''} ${btn.title}
                    </button>
                `;
            } else {
                return `
                    <a href="${btn.url}" 
                       style="background: ${btn.color}; 
                              color: white; 
                              padding: 0.6rem 1.2rem; 
                              border-radius: 20px; 
                              text-decoration: none; 
                              font-weight: 600; 
                              transition: all 0.3s ease; 
                              box-shadow: 0 2px 8px rgba(0,0,0,0.2); 
                              font-size: 1rem;"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)'">
                        ${btn.icon || ''} ${btn.title}
                    </a>
                `;
            }
        }).join('');
    }
    
    // 暴露 API
    window.ButtonsManager = {
        loadButtons,
        renderButtons,
        DEFAULT_BUTTONS
    };
    
    console.log('✅ 功能按鈕管理模組已載入');
})();
