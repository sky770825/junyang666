// ============================================
// 資料建檔管理模組
// ============================================
// 負責管理物件資料的建檔、驗證和格式化

(function() {
    'use strict';
    
    // 確保配置已載入
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('❌ SUPABASE_CONFIG 未載入，請先載入 supabase-config.js');
        return;
    }
    
    // 格式化格局（3/2/2 -> 3房2廳2衛）
    function formatLayout(layout) {
        if (!layout) return '';
        
        // 如果已經是格式化後的格式，直接返回
        if (layout.includes('房') || layout.includes('廳') || layout.includes('衛')) {
            return layout;
        }
        
        // 處理 3/2/2 格式
        const parts = layout.split('/');
        if (parts.length === 3) {
            return `${parts[0]}房${parts[1]}廳${parts[2]}衛`;
        }
        
        return layout;
    }
    
    // 格式化面積（自動加上「坪」）
    function formatArea(area) {
        if (!area) return '';
        
        // 如果已經有「坪」，直接返回
        if (typeof area === 'string' && area.includes('坪')) {
            return area;
        }
        
        // 提取數字
        const num = parseFloat(area);
        if (isNaN(num)) return area;
        
        return `${num}坪`;
    }
    
    // 格式化屋齡（自動加上「年」）
    function formatAge(age) {
        if (!age) return '';
        
        // 如果已經有「年」，直接返回
        if (typeof age === 'string' && age.includes('年')) {
            return age;
        }
        
        // 提取數字
        const num = parseFloat(age);
        if (isNaN(num)) return age;
        
        return `${num}年`;
    }
    
    // 驗證物件資料
    function validatePropertyData(property) {
        const errors = [];
        
        if (!property.title || property.title.trim() === '') {
            errors.push('物件標題為必填');
        }
        
        if (!property.price || property.price.trim() === '') {
            errors.push('售價為必填');
        }
        
        if (!property.address || property.address.trim() === '') {
            errors.push('地址為必填');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    // 格式化物件資料（統一格式化規則）
    function formatPropertyData(property) {
        const formatted = { ...property };
        
        // 格式化格局
        if (formatted.layout) {
            formatted.layout = formatLayout(formatted.layout);
        }
        
        // 格式化面積
        if (formatted.total_area) {
            formatted.total_area = formatArea(formatted.total_area);
        }
        if (formatted.main_area) {
            formatted.main_area = formatArea(formatted.main_area);
        }
        if (formatted.auxiliary_area) {
            formatted.auxiliary_area = formatArea(formatted.auxiliary_area);
        }
        if (formatted.common_area) {
            formatted.common_area = formatArea(formatted.common_area);
        }
        if (formatted.land_area) {
            formatted.land_area = formatArea(formatted.land_area);
        }
        if (formatted.parking_area) {
            formatted.parking_area = formatArea(formatted.parking_area);
        }
        
        // 格式化屋齡
        if (formatted.age) {
            formatted.age = formatAge(formatted.age);
        }
        
        return formatted;
    }
    
    // 暴露 API
    window.DataEntryManager = {
        formatLayout,
        formatArea,
        formatAge,
        validatePropertyData,
        formatPropertyData
    };
    
    console.log('✅ 資料建檔管理模組已載入');
})();
