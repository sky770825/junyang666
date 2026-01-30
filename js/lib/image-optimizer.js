/**
 * 圖片載入優化：壓縮畫質、WebP（Supabase 自動）、首屏預載入
 * - Supabase Storage：轉為 render URL 並加上 width、quality 以壓縮
 * - 其他 URL：原樣使用，可加 decoding/loading
 */
(function() {
    'use strict';

    var DEFAULT_WIDTH = 800;
    var DEFAULT_QUALITY = 80;
    var THUMB_WIDTH = 400;
    var THUMB_QUALITY = 75;

    /**
     * 判斷是否為 Supabase Storage 的 object 公開 URL
     */
    function isSupabaseStorageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return url.indexOf('supabase.co/storage/v1/object/public/') !== -1;
    }

    /**
     * 將 Supabase object URL 轉為 render URL（可縮圖與壓縮）
     * 例：.../object/public/bucket/path -> .../render/image/public/bucket/path?width=800&quality=80
     * Supabase 會依 Accept 自動回傳 WebP（多數瀏覽器）
     */
    function toSupabaseRenderUrl(url, options) {
        if (!url || !isSupabaseStorageUrl(url)) return url;
        var width = (options && options.width) || DEFAULT_WIDTH;
        var quality = (options && options.quality) || DEFAULT_QUALITY;
        var renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
        var sep = renderUrl.indexOf('?') !== -1 ? '&' : '?';
        return renderUrl + sep + 'width=' + width + '&quality=' + quality;
    }

    /**
     * 取得優化後的圖片 URL（Supabase 壓縮＋自動 WebP，其餘不變）
     * @param {string} url - 原始圖片 URL
     * @param {{ width?: number, quality?: number, thumb?: boolean }} options - thumb=true 時用較小尺寸
     */
    function getOptimizedImageUrl(url, options) {
        if (!url || typeof url !== 'string') return url;
        var opts = options || {};
        if (opts.thumb) {
            opts = { width: THUMB_WIDTH, quality: THUMB_QUALITY };
        }
        return isSupabaseStorageUrl(url) ? toSupabaseRenderUrl(url, opts) : url;
    }

    /**
     * 預載入首屏圖片（link rel="preload" as="image"）
     * @param {string[]} urls - 圖片 URL 陣列（建議已優化）
     * @param {number} maxCount - 最多預載幾張（預設 6）
     */
    function preloadFirstScreenImages(urls, maxCount) {
        if (typeof document === 'undefined' || !urls || !urls.length) return;
        var limit = (typeof maxCount === 'number' && maxCount > 0) ? maxCount : 6;
        var seen = window._preloadedFirstScreenUrls || (window._preloadedFirstScreenUrls = new Set());
        var head = document.head;
        for (var i = 0; i < urls.length && i < limit; i++) {
            var u = urls[i];
            if (!u || seen.has(u)) continue;
            seen.add(u);
            var link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = u;
            head.appendChild(link);
        }
    }

    window.ImageOptimizer = {
        getOptimizedImageUrl: getOptimizedImageUrl,
        preloadFirstScreenImages: preloadFirstScreenImages,
        isSupabaseStorageUrl: isSupabaseStorageUrl,
        defaults: { width: DEFAULT_WIDTH, quality: DEFAULT_QUALITY, thumbWidth: THUMB_WIDTH, thumbQuality: THUMB_QUALITY }
    };
})();
