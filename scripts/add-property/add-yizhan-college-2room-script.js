// 直接新增「益展學院景觀2房車」物件到 Supabase
// 執行方式: node add-yizhan-college-2room-script.js
// 樂屋網參考: https://www.leju.com.tw/community/Lce6102089c82c4

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
    const type = '2房';
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
        console.log('🚀 開始新增「益展學院景觀2房車」...');

        const propertyNumber = await generatePropertyNumber();
        console.log('✅ 生成的編號:', propertyNumber);

        // 資料來源：常順地產物件銷售資料表 PDF
        const propertyData = {
            number: propertyNumber,
            title: '益展學院景觀2房車',
            type: '2房',
            city: '桃園市',
            district: '楊梅區',
            address: '桃園市楊梅區福羚路151號9樓',
            address_detail: '福羚路151號9樓',
            hide_address_number: true,
            price: '1198萬',
            layout: '2房2廳1衛',
            total_area: '38.71坪',
            main_area: '18.165坪',
            auxiliary_area: '1.42坪',
            common_area: '9.28坪',
            land_area: '6.025坪',
            parking_area: '9.85坪',
            age: '8年',
            floor: '9樓/14樓',
            building_type: '大樓',
            orientation: null,
            management_fee: '2100元/月',
            parking_type: null,
            parking_space: 'B2-150',
            current_status: '空屋，隨時可看',
            community: '益展學院',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            reference_link: 'https://www.leju.com.tw/community/Lce6102089c82c4',
            description: `益展學院景觀2房車

・近瑞塘國小、瑞坪國中，孩童接送路程短
・近三商圈：四維商圈、文化商圈、梅獅路商圈
・近埔心車站、楊梅交流道，南北往返方便
・周邊商家成熟完善，全聯、萬大黃昏市場、四維公園
・社區環境單純清幽，居住氛圍舒適安心
・建物完成日：106.06.07，警衛管理、有天然瓦斯
・樂屋網詳情：https://www.leju.com.tw/community/Lce6102089c82c4`,
            images: [],
            transportation: {
                facilities: ['四維商圈', '文化商圈', '梅獅路商圈', '全聯', '萬大黃昏市場'],
                transport: ['縣道115號', '楊梅交流道', '幼獅交流道', '五楊交流道', '66快速道路', '楊梅區免費公車', '埔心火車站'],
                schools: ['瑞塘國小', '瑞坪國中'],
                market: '萬大黃昏市場',
                park: '四維公園'
            },
            features: []
        };

        Object.keys(propertyData).forEach(key => {
            if (propertyData[key] === '') {
                propertyData[key] = null;
            }
        });

        console.log('📤 準備新增物件:', JSON.stringify(propertyData, null, 2));

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
        console.log(`   售價: ${data.price}`);
        console.log(`   參考連結: ${data.reference_link}`);
        console.log(`   狀態: ${data.is_published ? '✅ 已上架' : '❌ 已下架'}`);
        console.log('\n💡 請至後台「物件管理」編輯此物件並上傳 9 張室內/景觀照片。');

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
