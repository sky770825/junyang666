/**
 * 非同步執行工具：將耗時處理移到下一幀或分批執行，避免阻塞 UI
 * - runOnNextFrame(fn)：下一幀執行
 * - runAsync(fn)：下一個 microtask / 下一 tick 執行
 * - runChunked(array, chunkSize, processChunk, onComplete)：分批處理陣列，每批後 yield
 */
(function() {
    'use strict';

    function runOnNextFrame(fn) {
        if (typeof requestAnimationFrame !== 'function') {
            setTimeout(fn, 0);
            return;
        }
        requestAnimationFrame(function() {
            requestAnimationFrame(fn);
        });
    }

    function runAsync(fn) {
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(fn);
            return;
        }
        Promise.resolve().then(fn).catch(function(e) {
            setTimeout(function() { throw e; }, 0);
        });
    }

    /**
     * 分批處理陣列，每處理 chunkSize 個就 yield 一幀，避免長時間阻塞
     * @param {Array} array
     * @param {number} chunkSize
     * @param {function(Array, number)} processChunk - (chunk, startIndex) => void，可將結果累積到外部變數
     * @param {function()} onComplete
     */
    function runChunked(array, chunkSize, processChunk, onComplete) {
        if (!array || array.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        var size = Math.max(1, Math.floor(chunkSize) || 8);
        var index = 0;

        function doChunk() {
            var end = Math.min(index + size, array.length);
            var chunk = array.slice(index, end);
            processChunk(chunk, index);
            index = end;
            if (index >= array.length) {
                if (onComplete) onComplete();
                return;
            }
            if (typeof requestAnimationFrame !== 'function') {
                setTimeout(doChunk, 0);
                return;
            }
            requestAnimationFrame(doChunk);
        }

        doChunk();
    }

    window.AsyncUtils = {
        runOnNextFrame: runOnNextFrame,
        runAsync: runAsync,
        runChunked: runChunked
    };
})();
