// 直接新增湖光翠堤市中心新古典美別墅物件到 Supabase
// 執行方式: node add-huguang-cuiti-script.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 獲取類型前綴
function getTypePrefix(type) {
    const prefixMap = {
        '套房': 'SU',
        '2房': 'TW',
        '3房': 'TH',
        '4房': 'FO',
        '華廈': 'HS',
        '公寓': 'AP',
        '透天': 'TH',
        '店面': 'ST',
        '別墅': 'VI',
        '店住': 'ST'
    };
    return prefixMap[type] || 'XX';
}

// 獲取所有物件編號
async function getAllPropertyNumbers() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('number')
            .not('number', 'is', null);
        
        if (error) throw error;
        
        return (data || []).map(p => p.number).filter(n => n);
    } catch (error) {
        console.error('獲取編號失敗:', error);
        return [];
    }
}

// 獲取下一個序號（店內物件）
function getNextInternalSequenceNumber(existingNumbers, prefix) {
    const typeNumbers = existingNumbers
        .filter(num => {
            if (!num || typeof num !== 'string') return false;
            if (num.startsWith('EX')) return false;
            const pattern = new RegExp(`^${prefix}\\d{5}$`);
            return pattern.test(num);
        })
        .map(num => {
            const match = num.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => b - a);
    
    return typeNumbers.length > 0 ? typeNumbers[0] + 1 : 1;
}

// 格式化序號
function formatSequenceNumber(seq, length) {
    return String(seq).padStart(length, '0');
}

// 生成物件編號
async function generatePropertyNumber() {
    const type = '別墅';
    const prefix = getTypePrefix(type);
    
    if (!prefix || prefix === 'XX') {
        throw new Error('無法識別的房型');
    }
    
    const existingNumbers = await getAllPropertyNumbers();
    const nextSeq = getNextInternalSequenceNumber(existingNumbers, prefix);
    const formattedSeq = formatSequenceNumber(nextSeq, 5);
    const newNumber = `${prefix}${formattedSeq}`;
    
    if (existingNumbers.includes(newNumber)) {
        throw new Error('生成的編號重複，請重試');
    }
    
    return newNumber;
}

// 新增物件
async function addProperty() {
    try {
        console.log('🚀 開始新增物件...');
        
        // 生成編號
        const propertyNumber = await generatePropertyNumber();
        console.log('✅ 生成的編號:', propertyNumber);
        
        // 準備物件資料
        const propertyData = {
            number: propertyNumber,
            title: '湖光翠堤市中心新古典美別墅',
            type: '別墅',
            city: '桃園市',
            district: '龍潭區',
            address: '桃園市龍潭區新龍路188巷',
            address_detail: '新龍路188巷',
            hide_address_number: false,
            price: '2088萬',
            layout: '4房2廳3衛',
            total_area: '67.14坪',
            main_area: null,
            auxiliary_area: null,
            common_area: null,
            land_area: '24.41坪',
            parking_area: null,
            age: '20年',
            floor: '1-5樓/5樓',
            building_type: '別墅',
            orientation: '坐北朝南',
            management_fee: null,
            parking_type: '室內車位',
            parking_space: '室內雙車位',
            current_status: null,
            community: '湖光翠堤',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `湖光翠堤市中心新古典美別墅

【物件基本資料】
- 總價：2,088 萬
- 單價：約 31.1 萬/坪
- 地坪：24.41 坪
- 建坪（權狀）：67.14 坪
- 格局：4 房 / 2 廳 / 3 衛
- 樓層：1樓 ~ 5樓
- 屋齡：約 20 年
- 朝向：坐北朝南
- 車位：室內雙車位
- 社區：湖光翠堤
- 地址：桃園市龍潭區新龍路188巷

【物件核心優勢】
1️⃣ 精華地段  
位於龍潭市中心，鬧中取靜，周邊生活機能完善，社區釋出稀有，具備長期自住與保值優勢。

2️⃣ 空間寬敞  
地坪達 24.41 坪，建坪約 67.14 坪，規劃 4 房 2 廳 3 衛，另擁有室內雙車位，停車便利、安全又不怕日曬雨淋。

3️⃣ 屋況與格局佳  
格局方正、採光與通風條件優良，室內維持新古典美裝潢，整體質感佳，可直接入住或再依喜好微調。

4️⃣ 生活機能優勢  
鄰近市中心機能、便利商店、公園綠地等，下樓即可享受市區生活便利，又保有寧靜住宅氛圍。

【備註】
實際坪數、權狀資料與使用分區等詳細資訊，以不動產說明書及謄本記載為準。`,
            images: [],
            transportation: {
                facilities: ['龍潭市中心生活機能', '便利商店', '公園綠地'],
                transport: ['新龍路', '鄰近市區主要幹道'],
                schools: [],
                market: null,
                park: '公園綠地（社區周邊）'
            },
            features: [
                '位於龍潭市中心，鬧中取靜，釋出稀有',
                '地坪24.41坪、建坪67.14坪，空間寬敞',
                '室內雙車位，停車便利又安全',
                '格局方正，採光通風佳，新古典美裝潢',
                '鄰近便利商店與公園綠地，生活機能優'
            ]
        };
        
        // 清理空字串，轉換為 null
        Object.keys(propertyData).forEach(key => {
            if (propertyData[key] === '') {
                propertyData[key] = null;
            }
        });
        
        console.log('📤 準備新增物件:', JSON.stringify(propertyData, null, 2));
        
        // 新增到資料庫
        const { data: insertData, error: insertError } = await supabase
            .from('properties')
            .insert([propertyData])
            .select();
        
        if (insertError) throw insertError;
        
        const data = insertData && insertData.length > 0 ? insertData[0] : null;
        if (!data) {
            throw new Error('新增成功但無法取得資料');
        }
        
        console.log('\n✅ 物件新增成功！');
        console.log('📋 物件資訊:');
        console.log(`   編號: ${data.number}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   案名: ${data.title}`);
        console.log(`   地址: ${data.address}`);
        console.log(`   售價: ${data.price}`);
        console.log(`   隱藏地址: ${data.hide_address_number ? '✅ 已勾選' : '❌ 未勾選'}`);
        console.log(`   狀態: ${data.is_published ? '✅ 已上架' : '❌ 已下架'}`);
        
        return data;
        
    } catch (error) {
        console.error('\n❌ 新增失敗:', error.message);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        throw error;
    }
}

// 執行新增
if (require.main === module) {
    addProperty()
        .then(() => {
            console.log('\n🎉 完成！');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 執行失敗');
            process.exit(1);
        });
}

module.exports = { addProperty, generatePropertyNumber };

