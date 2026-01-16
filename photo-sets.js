// 照片集合資料 - 從 script.js 提取
// 使用方式：在 HTML 中引入此文件即可

// 照片集合資料結構
let photoSets = {
    'property1': {
        images: [
            { src: 'images/2-1/客廳.jpg', title: '客廳' },
            { src: 'images/2-1/客廳視角2.jpg', title: '客廳視角2' },
            { src: 'images/2-1/客廳視角3.jpg', title: '客廳視角3' },
            { src: 'images/2-1/客廳視角4.jpg', title: '客廳視角4' },
            { src: 'images/2-1/玄關.jpg', title: '玄關' },
            { src: 'images/2-1/主臥房.jpg', title: '主臥房' },
            { src: 'images/2-1/主臥房2.jpg', title: '主臥房2' },
            { src: 'images/2-1/次臥房.jpg', title: '次臥房' },
            { src: 'images/2-1/衛浴.jpg', title: '衛浴' },
            { src: 'images/2-1/陽台照片.jpg', title: '陽台照片' },
            { src: 'images/2-1/陽台照片2.jpg', title: '陽台照片2' },
            { src: 'images/2-1/格局圖.png', title: '格局圖' }
        ]
    },
    'property1b': {
        images: [
            { src: 'images/2-2/客廳.jpg', title: '客廳' },
            { src: 'images/2-2/客餐廳.jpg', title: '客餐廳' },
            { src: 'images/2-2/主臥房.jpg', title: '主臥房' },
            { src: 'images/2-2/次臥房.jpg', title: '次臥房' },
            { src: 'images/2-2/廚房.jpg', title: '廚房' },
            { src: 'images/2-2/衛浴.jpg', title: '衛浴' },
            { src: 'images/2-2/格局圖.jpg', title: '格局圖' }
        ]
    },
    'property2': {
        images: [
            { src: 'images/3-1/客廳.jpg', title: '客廳' },
            { src: 'images/3-1/客廳1.jpg', title: '客廳1' },
            { src: 'images/3-1/客廳2.jpg', title: '客廳2' },
            { src: 'images/3-1/廚房.jpg', title: '廚房' },
            { src: 'images/3-1/主臥.jpg', title: '主臥' },
            { src: 'images/3-1/次臥房-1.jpg', title: '次臥房-1' },
            { src: 'images/3-1/次臥房-1-1.jpg', title: '次臥房-1-1' },
            { src: 'images/3-1/次臥房2.jpg', title: '次臥房2' },
            { src: 'images/3-1/次臥房2-1.jpg', title: '次臥房2-1' },
            { src: 'images/3-1/次臥房3.jpg', title: '次臥房3' },
            { src: 'images/3-1/衛浴1.jpg', title: '衛浴1' },
            { src: 'images/3-1/廁所.jpg', title: '廁所' },
            { src: 'images/3-1/陽台.jpg', title: '陽台' },
            { src: 'images/3-1/格局圖.jpg', title: '格局圖' }
        ]
    },
    'property2b': {
        images: [
            { src: 'images/3-2/客廳.jpg', title: '客廳' },
            { src: 'images/3-2/主臥.jpg', title: '主臥' },
            { src: 'images/3-2/主臥1.jpg', title: '主臥1' },
            { src: 'images/3-2/廚房.jpg', title: '廚房' },
            { src: 'images/3-2/後陽台.jpg', title: '後陽台' },
            { src: 'images/3-2/房間.jpg', title: '房間' },
            { src: 'images/3-2/衛浴.jpg', title: '衛浴' },
            { src: 'images/3-2/陽台景觀.jpg', title: '陽台景觀' },
            { src: 'images/3-2/B205CS178329j.jpg', title: 'B205CS178329j' },
            { src: 'images/3-2/B205CS178329k.jpg', title: 'B205CS178329k' },
            { src: 'images/3-2/格局圖.jpg', title: '格局圖' }
        ]
    },
    'property3a': {
        images: [
            { src: 'images/4-1/客廳.jpg', title: '客廳' },
            { src: 'images/4-1/廚房.jpg', title: '廚房' },
            { src: 'images/4-1/主臥房視角.jpg', title: '主臥房視角' },
            { src: 'images/4-1/主臥房視角2.jpg', title: '主臥房視角2' },
            { src: 'images/4-1/次臥房.jpg', title: '次臥房' },
            { src: 'images/4-1/次臥房3.jpg', title: '次臥房3' },
            { src: 'images/4-1/次臥房4.jpg', title: '次臥房4' },
            { src: 'images/4-1/衛浴.jpg', title: '衛浴' },
            { src: 'images/4-1/前陽台.jpg', title: '前陽台' },
            { src: 'images/4-1/前陽台景觀.jpg', title: '前陽台景觀' },
            { src: 'images/4-1/後陽台.jpg', title: '後陽台' },
            { src: 'images/4-1/陽台景觀.jpg', title: '陽台景觀' },
            { src: 'images/4-1/格局圖.jpg', title: '格局圖' }
        ]
    },
    'property3b': {
        images: [
            { src: 'images/4-2/客廳全景.jpg', title: '客廳全景' },
            { src: 'images/4-2/客廳細節.jpg', title: '客廳細節' },
            { src: 'images/4-2/客廳角度二.jpg', title: '客廳角度二' },
            { src: 'images/4-2/廚房.jpg', title: '廚房' },
            { src: 'images/4-2/主臥室.jpg', title: '主臥室' },
            { src: 'images/4-2/次臥室.jpg', title: '次臥室' },
            { src: 'images/4-2/次臥房3.jpg', title: '次臥房3' },
            { src: 'images/4-2/次臥房4.jpg', title: '次臥房4' },
            { src: 'images/4-2/臥室細節.jpg', title: '臥室細節' },
            { src: 'images/4-2/衛浴開窗.jpg', title: '衛浴開窗' },
            { src: 'images/4-2/主臥衛浴開窗.jpg', title: '主臥衛浴開窗' },
            { src: 'images/4-2/後陽台.jpg', title: '後陽台' },
            { src: 'images/4-2/陽台景觀.jpg', title: '陽台景觀' },
            { src: 'images/4-2/格局圖.jpg', title: '格局圖' }
        ]
    }
};

// 匯出資料供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = photoSets;
}
