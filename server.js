// 物件管理後端 API
// 使用 Node.js + Express + SQLite + Multer

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 配置（從 supabase-config.js 讀取或直接設定）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

// 初始化 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// 伺服器端快取（記憶體 TTL，減少資料庫查詢）
// ============================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘
const cache = new Map(); // key -> { data, expiresAt }

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs
    });
}

function invalidateCache(keyOrPrefix) {
    if (!keyOrPrefix) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
            cache.delete(key);
        }
    }
}

// 中間件
// CORS 設定（允許所有來源，包括 127.0.0.1 和 localhost）
app.use(cors({
    origin: '*', // 允許所有來源（開發環境）
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// 提供靜態文件（HTML、CSS、JS等）
app.use(express.static(__dirname));

// 建立上傳資料夾
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 設定 Multer（圖片上傳）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案（JPG、PNG、GIF、WEBP）'));
        }
    }
});

// 初始化資料庫
let db = null;

try {
    db = new sqlite3.Database('properties.db', (err) => {
        if (err) {
            console.error('❌ 資料庫連接錯誤:', err);
            console.warn('⚠️ 將繼續運行，但物件 API 可能無法使用');
        } else {
            console.log('✅ 已連接到 SQLite 資料庫');
            
            // 建立物件表
            db.run(`CREATE TABLE IF NOT EXISTS properties (
            id TEXT PRIMARY KEY,
            number TEXT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT NOT NULL,
            price TEXT NOT NULL,
            layout TEXT NOT NULL,
            total_area TEXT NOT NULL,
            community TEXT,
            main_area TEXT,
            auxiliary_area TEXT,
            common_area TEXT,
            land_area TEXT,
            parking_area TEXT,
            age TEXT,
            floor TEXT,
            building_type TEXT,
            orientation TEXT,
            management_fee TEXT,
            parking_type TEXT,
            parking_space TEXT,
            current_status TEXT,
            status TEXT,
            statusText TEXT,
            description TEXT,
            google_maps TEXT,
            tiktok_video_id TEXT,
            tiktok_username TEXT,
            reference_link TEXT,
            images TEXT,
            transportation TEXT,
            features TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
                if (err) {
                    console.error('建立資料表錯誤:', err);
                } else {
                    console.log('✅ 資料表已準備就緒');
                }
            });
        }
    });
} catch (dbError) {
    console.error('❌ 資料庫初始化失敗:', dbError);
    console.warn('⚠️ 將繼續運行，但物件 API 可能無法使用');
}

// 生成物件 ID
function generatePropertyId() {
    return 'prop_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// 路由

// 上傳圖片
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '沒有上傳圖片' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename
    });
});

// 獲取所有物件（含快取）
app.get('/api/properties', (req, res) => {
    if (!db) {
        console.error('❌ API: 資料庫未連接');
        return res.status(503).json({ 
            error: '資料庫未連接',
            message: 'SQLite 資料庫尚未初始化，請檢查 server.js 日誌'
        });
    }
    
    const cached = getCached('properties:list');
    if (cached !== null) {
        console.log('📦 API: 從快取返回物件列表');
        return res.json(cached);
    }
    
    console.log('🔄 API: 正在查詢所有物件...');
    
    try {
        db.all('SELECT * FROM properties ORDER BY created_at DESC', [], (err, rows) => {
            if (err) {
                console.error('❌ API: 查詢錯誤:', err);
                return res.status(500).json({ 
                    error: '查詢失敗',
                    message: err.message,
                    details: err.toString()
                });
            }
            
            // 如果沒有資料，返回空陣列（不是錯誤）
            if (!rows || rows.length === 0) {
                console.log('ℹ️ API: 資料庫中沒有物件資料，返回空陣列');
                return res.json([]);
            }
            
            // 解析 JSON 欄位
            const properties = rows.map(row => {
                const property = { ...row };
                if (property.images) {
                    try {
                        property.images = JSON.parse(property.images);
                    } catch (e) {
                        property.images = [];
                    }
                }
                if (property.transportation) {
                    try {
                        property.transportation = JSON.parse(property.transportation);
                    } catch (e) {
                        property.transportation = {};
                    }
                }
                if (property.features) {
                    try {
                        property.features = JSON.parse(property.features);
                    } catch (e) {
                        property.features = [];
                    }
                }
                return property;
            });
            
            console.log(`✅ API: 成功返回 ${properties.length} 個物件`);
            setCache('properties:list', properties);
            res.json(properties);
        });
    } catch (error) {
        console.error('❌ API: 處理錯誤:', error);
        return res.status(500).json({
            error: '伺服器錯誤',
            message: error.message
        });
    }
});

// 獲取單一物件（含快取）
app.get('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    const cacheKey = 'properties:id:' + id;
    
    const cached = getCached(cacheKey);
    if (cached !== null) {
        console.log('📦 API: 從快取返回單一物件');
        return res.json(cached);
    }
    
    db.get('SELECT * FROM properties WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('查詢錯誤:', err);
            return res.status(500).json({ error: '查詢失敗' });
        }
        
        if (!row) {
            return res.status(404).json({ error: '物件不存在' });
        }
        
        // 解析 JSON 欄位
        const property = { ...row };
        if (property.images) {
            try {
                property.images = JSON.parse(property.images);
            } catch (e) {
                property.images = [];
            }
        }
        if (property.transportation) {
            try {
                property.transportation = JSON.parse(property.transportation);
            } catch (e) {
                property.transportation = {};
            }
        }
        if (property.features) {
            try {
                property.features = JSON.parse(property.features);
            } catch (e) {
                property.features = [];
            }
        }
        
        setCache(cacheKey, property);
        res.json(property);
    });
});

// 新增物件（新增後清除列表快取）
app.post('/api/properties', (req, res) => {
    const property = req.body;
    
    // 生成 ID（如果沒有提供）
    if (!property.id) {
        property.id = generatePropertyId();
    }
    
    // 將陣列轉換為 JSON 字串
    const images = property.images ? JSON.stringify(property.images) : '[]';
    const transportation = property.transportation ? JSON.stringify(property.transportation) : '{}';
    const features = property.features ? JSON.stringify(property.features) : '[]';
    
    const sql = `INSERT INTO properties (
        id, number, title, type, address, price, layout, total_area,
        community, main_area, auxiliary_area, common_area, land_area,
        parking_area, age, floor, building_type, orientation,
        management_fee, parking_type, parking_space, current_status,
        status, statusText, description, google_maps, tiktok_video_id,
        tiktok_username, reference_link, images, transportation, features
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        property.id,
        property.number || null,
        property.title,
        property.type,
        property.address,
        property.price,
        property.layout,
        property.total_area,
        property.community || null,
        property.main_area || null,
        property.auxiliary_area || null,
        property.common_area || null,
        property.land_area || null,
        property.parking_area || null,
        property.age || null,
        property.floor || null,
        property.building_type || null,
        property.orientation || null,
        property.management_fee || null,
        property.parking_type || null,
        property.parking_space || null,
        property.current_status || null,
        property.status || null,
        property.statusText || null,
        property.description || null,
        property.google_maps || null,
        property.tiktok_video_id || null,
        property.tiktok_username || null,
        property.reference_link || null,
        images,
        transportation,
        features
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('新增錯誤:', err);
            return res.status(500).json({ error: '新增失敗' });
        }
        invalidateCache('properties');
        res.json({
            success: true,
            id: property.id,
            message: '物件已新增'
        });
    });
});

// 更新物件（更新後清除該筆與列表快取）
app.put('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    const property = req.body;
    
    // 將陣列轉換為 JSON 字串
    const images = property.images ? JSON.stringify(property.images) : '[]';
    const transportation = property.transportation ? JSON.stringify(property.transportation) : '{}';
    const features = property.features ? JSON.stringify(property.features) : '[]';
    
    const sql = `UPDATE properties SET
        number = ?, title = ?, type = ?, address = ?, price = ?, layout = ?, total_area = ?,
        community = ?, main_area = ?, auxiliary_area = ?, common_area = ?, land_area = ?,
        parking_area = ?, age = ?, floor = ?, building_type = ?, orientation = ?,
        management_fee = ?, parking_type = ?, parking_space = ?, current_status = ?,
        status = ?, statusText = ?, description = ?, google_maps = ?, tiktok_video_id = ?,
        tiktok_username = ?, reference_link = ?, images = ?, transportation = ?, features = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const values = [
        property.number || null,
        property.title,
        property.type,
        property.address,
        property.price,
        property.layout,
        property.total_area,
        property.community || null,
        property.main_area || null,
        property.auxiliary_area || null,
        property.common_area || null,
        property.land_area || null,
        property.parking_area || null,
        property.age || null,
        property.floor || null,
        property.building_type || null,
        property.orientation || null,
        property.management_fee || null,
        property.parking_type || null,
        property.parking_space || null,
        property.current_status || null,
        property.status || null,
        property.statusText || null,
        property.description || null,
        property.google_maps || null,
        property.tiktok_video_id || null,
        property.tiktok_username || null,
        property.reference_link || null,
        images,
        transportation,
        features,
        id
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('更新錯誤:', err);
            return res.status(500).json({ error: '更新失敗' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '物件不存在' });
        }
        invalidateCache('properties');
        res.json({
            success: true,
            message: '物件已更新'
        });
    });
});

// 刪除物件（刪除後清除該筆與列表快取）
app.delete('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    
    // 先獲取物件資訊（包含圖片路徑）
    db.get('SELECT images FROM properties WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('查詢錯誤:', err);
            return res.status(500).json({ error: '查詢失敗' });
        }
        
        if (!row) {
            return res.status(404).json({ error: '物件不存在' });
        }
        
        // 刪除相關圖片檔案
        try {
            const images = JSON.parse(row.images || '[]');
            images.forEach(imageUrl => {
                if (imageUrl.startsWith('/uploads/')) {
                    const imagePath = path.join(__dirname, imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            });
        } catch (e) {
            console.error('刪除圖片錯誤:', e);
        }
        
        // 刪除資料庫記錄
        db.run('DELETE FROM properties WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('刪除錯誤:', err);
                return res.status(500).json({ error: '刪除失敗' });
            }
            invalidateCache('properties');
            res.json({
                success: true,
                message: '物件已刪除'
            });
        });
    });
});

// ============================================
// 相關連結 API 端點（含快取）
// ============================================

// 獲取所有啟用的相關連結（前端使用，5 分鐘快取）
app.get('/api/related-links', async (req, res) => {
    try {
        const cached = getCached('related-links');
        if (cached !== null) {
            console.log('📦 後端 API: 從快取返回相關連結');
            return res.json(cached);
        }
        
        console.log('🔄 後端 API: 正在從 Supabase 載入相關連結...');
        
        // 從 Supabase 載入啟用的連結
        const { data: links, error: linksError } = await supabase
            .from('related_links')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        
        if (linksError) {
            console.error('❌ Supabase 查詢失敗:', linksError);
            return res.status(500).json({ 
                error: '載入連結失敗',
                message: linksError.message 
            });
        }
        
        // 載入下拉選單項目
        let items = [];
        if (links && links.length > 0) {
            const { data: itemsData, error: itemsError } = await supabase
                .from('related_link_items')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            
            if (!itemsError && itemsData) {
                items = itemsData;
            }
        }
        
        // 將項目分組到對應的連結
        const itemsByParent = {};
        items.forEach(item => {
            if (!itemsByParent[item.parent_link_id]) {
                itemsByParent[item.parent_link_id] = [];
            }
            itemsByParent[item.parent_link_id].push(item);
        });
        
        // 組合連結和項目
        const result = links.map(link => ({
            ...link,
            items: itemsByParent[link.id] || []
        }));
        
        console.log(`✅ 後端 API: 成功載入 ${result.length} 個連結`);
        const response = {
            success: true,
            data: result,
            count: result.length
        };
        setCache('related-links', response);
        res.json(response);
    } catch (error) {
        console.error('❌ 後端 API 錯誤:', error);
        res.status(500).json({
            error: '伺服器錯誤',
            message: error.message
        });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
    console.log(`📝 API 端點: http://localhost:${PORT}/api`);
    console.log(`📸 圖片上傳: http://localhost:${PORT}/api/upload`);
    console.log(`🔗 相關連結: http://localhost:${PORT}/api/related-links`);
    console.log(`📊 資料庫狀態: ${db ? '✅ 已連接' : '❌ 未連接'}`);
});

// 優雅關閉
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('關閉資料庫錯誤:', err);
            } else {
                console.log('✅ 資料庫連接已關閉');
            }
            process.exit(0);
        });
    } else {
        console.log('✅ 伺服器已關閉');
        process.exit(0);
    }
});
