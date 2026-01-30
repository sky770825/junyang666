// 主要腳本模組
// ✅ v2.0 - 模組化版本（Phase 3 完成）
// 燈箱/地圖/TikTok/貸款試算已移至 js/lib/lightbox.js, map-modal.js, tiktok-modal.js, loan-calculator.js
// 工具函數已移至 js/lib/utils.js
// 本檔僅保留：F5 處理、分頁初始化、DOMContentLoaded（輪播與下拉選單）

// F5 鍵處理 - 確保在當前頁面刷新
document.addEventListener('keydown', function(e) {
    if (e.keyCode === 116 || e.key === 'F5') {
        e.preventDefault();
        location.reload();
    }
});

// 從 bfcache 返回首頁時，恢復篩選為「全部」並刷新列表與數量（避免篩選/數量錯亂）
window.addEventListener('pageshow', function(e) {
    if (!e.persisted) return;
    var isIndex = document.getElementById('filter-section') !== null;
    if (!isIndex || typeof embeddedPaginationSystem === 'undefined' || !embeddedPaginationSystem) return;
    if (typeof embeddedPaginationSystem.resetFiltersToAll === 'function') {
        embeddedPaginationSystem.resetFiltersToAll();
    }
});

let embeddedPaginationSystem;
let lastUpdateTimestamp = null;
let isUpdatingPagination = false;

window.addEventListener('needPaginationInit', function(event) {
    if (embeddedPaginationSystem) return;
    if (typeof EmbeddedPropertyPaginationSystem !== 'undefined') {
        if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
        }
    }
}, { once: true });

window.addEventListener('supabaseDataLoaded', function(event) {
    const eventData = event.detail || {};
    const propertyCount = eventData.count || (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0);
    const eventTimestamp = eventData.timestamp || new Date().toISOString();
    if (lastUpdateTimestamp === eventTimestamp && isUpdatingPagination) return;
    window.lastPropertyCount = propertyCount;
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
        isUpdatingPagination = true;
        lastUpdateTimestamp = eventTimestamp;
        if (embeddedPaginationSystem) {
            embeddedPaginationSystem.allProperties = embeddedPropertiesData.properties;
            embeddedPaginationSystem.properties = embeddedPropertiesData.properties.filter(p => p.status !== 'sold');
            embeddedPaginationSystem.soldProperties = embeddedPropertiesData.properties.filter(p => p.status === 'sold');
            embeddedPaginationSystem.filteredCache = null;
            embeddedPaginationSystem.cacheKey = '';
            if (embeddedPaginationSystem.cardCache) embeddedPaginationSystem.cardCache.clear();
            if (typeof embeddedPaginationSystem.updateDistrictOptions === 'function') embeddedPaginationSystem.updateDistrictOptions();
            if (typeof embeddedPaginationSystem.updateRoomFilterButtons === 'function') embeddedPaginationSystem.updateRoomFilterButtons();
            embeddedPaginationSystem.renderProperties();
            if (typeof embeddedPaginationSystem.updateFilterCounts === 'function') embeddedPaginationSystem.updateFilterCounts();
        } else if (typeof EmbeddedPropertyPaginationSystem !== 'undefined' && !embeddedPaginationSystem) {
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
            if (embeddedPaginationSystem) embeddedPaginationSystem.renderProperties();
        }
        setTimeout(function() { isUpdatingPagination = false; }, 100);
    } else {
        isUpdatingPagination = false;
    }
}, { once: false });

window.addEventListener('apiDataLoaded', function() {
    if (window.lastPropertyCount !== undefined && window.lastPropertyCount > 0) return;
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
        if (embeddedPaginationSystem) {
            embeddedPaginationSystem.allProperties = embeddedPropertiesData.properties;
            embeddedPaginationSystem.properties = embeddedPropertiesData.properties.filter(p => p.status !== 'sold');
            embeddedPaginationSystem.soldProperties = embeddedPropertiesData.properties.filter(p => p.status === 'sold');
            embeddedPaginationSystem.filteredCache = null;
            embeddedPaginationSystem.cacheKey = '';
            if (embeddedPaginationSystem.cardCache) embeddedPaginationSystem.cardCache.clear();
            embeddedPaginationSystem.renderProperties();
            if (typeof embeddedPaginationSystem.updateFilterCounts === 'function') embeddedPaginationSystem.updateFilterCounts();
        } else if (typeof EmbeddedPropertyPaginationSystem !== 'undefined' && !embeddedPaginationSystem) {
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
        }
    }
}, { once: false });

document.addEventListener('DOMContentLoaded', function() {
    function initializePaginationSystem() {
        if (typeof embeddedPropertiesData === 'undefined' || !embeddedPropertiesData.properties || embeddedPropertiesData.properties.length === 0) return false;
        if (!embeddedPaginationSystem) {
            try {
                embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
                window.paginationSystem = embeddedPaginationSystem;
                return true;
            } catch (error) {
                console.error('❌ 分頁系統初始化時發生錯誤:', error);
                return false;
            }
        }
        if (!window.paginationSystem) window.paginationSystem = embeddedPaginationSystem;
        return false;
    }
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
        initializePaginationSystem();
    }
    if (!window.paginationSystemInitChecked) {
        window.paginationSystemInitChecked = true;
        setTimeout(function() {
            if (!embeddedPaginationSystem && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
                initializePaginationSystem();
            }
        }, 1000);
    }
    var currentTestimonialIndex = 0;
    var testimonialSlides = document.getElementById('testimonialSlides');
    var testimonialPrev = document.getElementById('testimonialPrev');
    var testimonialNext = document.getElementById('testimonialNext');
    var totalTestimonials = document.querySelectorAll('.testimonial-slide').length;
    function updateTestimonialCarousel() {
        if (testimonialSlides) testimonialSlides.style.transform = 'translateX(-' + currentTestimonialIndex * 100 + '%)';
    }
    if (testimonialPrev) {
        testimonialPrev.addEventListener('click', function() {
            currentTestimonialIndex = currentTestimonialIndex > 0 ? currentTestimonialIndex - 1 : totalTestimonials - 1;
            updateTestimonialCarousel();
        });
    }
    if (testimonialNext) {
        testimonialNext.addEventListener('click', function() {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        });
    }
    setInterval(function() {
        if (totalTestimonials > 1) {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        }
    }, 5000);
    var propertyInfoDropdown = document.getElementById('propertyInfoDropdown');
    var propertyInfoMenu = document.getElementById('propertyInfoMenu');
    if (propertyInfoDropdown && propertyInfoMenu) {
        propertyInfoDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            var isVisible = propertyInfoMenu.style.display === 'block';
            propertyInfoMenu.style.display = isVisible ? 'none' : 'block';
            var arrow = propertyInfoDropdown.querySelector('span');
            if (arrow) arrow.textContent = isVisible ? '▼' : '▲';
        });
        document.addEventListener('click', function() {
            propertyInfoMenu.style.display = 'none';
            var arrow = propertyInfoDropdown.querySelector('span');
            if (arrow) arrow.textContent = '▼';
        });
        propertyInfoMenu.addEventListener('click', function(e) { e.stopPropagation(); });
    }
});

