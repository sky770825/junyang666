// 物件管理後端 API
// 使用 Node.js + Express + SQLite + Multer

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
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
const db = new sqlite3.Database('properties.db', (err) => {
    if (err) {
        console.error('資料庫連接錯誤:', err);
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

// 獲取所有物件
app.get('/api/properties', (req, res) => {
    db.all('SELECT * FROM properties ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('查詢錯誤:', err);
            return res.status(500).json({ error: '查詢失敗' });
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
        
        res.json(properties);
    });
});

// 獲取單一物件
app.get('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    
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
        
        res.json(property);
    });
});

// 新增物件
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
        
        res.json({
            success: true,
            id: property.id,
            message: '物件已新增'
        });
    });
});

// 更新物件
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
        
        res.json({
            success: true,
            message: '物件已更新'
        });
    });
});

// 刪除物件
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
            
            res.json({
                success: true,
                message: '物件已刪除'
            });
        });
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
    console.log(`📝 API 端點: http://localhost:${PORT}/api`);
    console.log(`📸 圖片上傳: http://localhost:${PORT}/api/upload`);
});

// 優雅關閉
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('關閉資料庫錯誤:', err);
        } else {
            console.log('✅ 資料庫連接已關閉');
        }
        process.exit(0);
    });
});
