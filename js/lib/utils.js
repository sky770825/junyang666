/**
 * 工具函數 - 從 main-script.js 抽出
 * 含：標題字體調整、resize 監聽
 */
(function() {
    'use strict';

    function adjustTitleFontSize() {
        const titles = document.querySelectorAll('.property-title');
        const screenWidth = window.innerWidth;

        titles.forEach(title => {
            let fontSize;
            if (screenWidth <= 480) {
                fontSize = 0.85;
            } else if (screenWidth <= 768) {
                fontSize = 0.9;
            } else if (screenWidth <= 1024) {
                fontSize = 0.9;
            } else {
                fontSize = 0.95;
            }

            title.style.fontSize = fontSize + 'rem';

            const minFontSize = screenWidth <= 480 ? 0.65 : 0.7;
            while (title.scrollWidth > title.clientWidth && fontSize > minFontSize) {
                fontSize -= 0.05;
                title.style.fontSize = fontSize + 'rem';
            }
        });
    }

    window.addEventListener('resize', () => {
        setTimeout(adjustTitleFontSize, 100);
    });

    window.adjustTitleFontSize = adjustTitleFontSize;
})();
