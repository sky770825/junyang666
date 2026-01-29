// 直接新增頭重溪公園旁 3+1+車物件到 Supabase
// 執行方式: node add-touzhongxi-park-4room-script.js

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
    const type = '4房';
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
            title: '頭重溪公園旁 3+1+車',
            type: '4房',
            city: '桃園市',
            district: '楊梅區',
            address: '桃園市楊梅區三民北路162巷3號4樓',
            address_detail: '三民北路162巷3號4樓',
            hide_address_number: true, // ✅ 隱藏地址已勾選
            price: '998萬',
            layout: '4房2廳2衛',
            total_area: '49.32坪',
            main_area: '29.01坪',
            auxiliary_area: '3.04坪',
            common_area: '2.47坪',
            land_area: '6.8坪',
            parking_area: '14.8坪',
            age: '23年',
            floor: '4/9樓',
            building_type: '華廈',
            orientation: '座南朝北',
            management_fee: '1600元/月',
            parking_type: '坡道平面',
            parking_space: 'B1-24',
            current_status: '空屋,隨時可看',
            community: '滿福',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `頭重溪公園旁 3+1+車

低總價買精華地段大三房+車位
中悅建設,優質學區
近楊梅交流道交通方便
學校走路就到
大室內空間格局方正
採光好
愛買商圈全聯生活機能超棒

臨路寬：10米
面寬：5米
裝潢：有
警衛管理：有
天然瓦斯：有`,
            images: [],
            transportation: {
                facilities: ['愛買商圈', '新農街商圈', '全聯福利中心', '國稅局-楊梅分局'],
                transport: ['台1線', '楊梅交流道', '楊梅區免費公車'],
                schools: ['瑞梅國小'],
                market: '全聯福利中心、愛買商圈',
                park: '頭重溪公園'
            },
            features: []
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
