// 直接新增新都悅大露台3+1房雙車位物件到 Supabase
// 執行方式: node scripts/add-property/add-xinduyue-3room-script.js

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
    const type = '3房';
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
            title: '大露台3+1房雙車位',
            type: '3房',
            city: '桃園市',
            district: '楊梅區',
            address: '桃園市楊梅區梅獅路二段186號2樓',
            address_detail: '梅獅路二段186號2樓',
            hide_address_number: false,
            price: '1598萬',
            layout: '3房2廳2衛',
            total_area: '66.14坪',
            main_area: '27.44坪',
            auxiliary_area: '4.34坪',
            common_area: '11.95坪',
            land_area: '8.31坪',
            parking_area: '22.41坪',
            age: '12年',
            floor: '2樓/13樓',
            building_type: '大樓',
            orientation: '座西南朝東北',
            management_fee: '3243元/月',
            parking_type: '地下室',
            parking_space: 'B1-289、B1-290',
            current_status: '空屋，隨時可看',
            community: '新都悅',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `大露台3+1房雙車位

全室美裝潢、拎包即可入住
室內大坪數、不含陽台有27坪
稀有大露台、好規劃
B1雙車位近電梯口旁
梅獅商圈、商店林立、機能棒

房屋型式：大樓
屋齡：12年（建物完成日：民國103年01月05日）
管理費：3243元/月
出售樓層：2樓
最高樓層：13樓
地下樓層：3樓
套房：一間
警衛管理：有
座向：座西南朝東北
天然瓦斯：有
裝潢：有
臨路寬：8米
面寬：0米
車位：B1-289、B1-290
機車位：有
目前現況：空屋，隨時可看
KEY：洽開發`,
            images: [],
            transportation: {
                facilities: ['梅獅路商圈', 'UNIQLO', '星巴克 Starbucks', '全聯福利中心', '職人的店', '貴族世家'],
                transport: ['台1線', '楊梅交流道', '幼獅交流道', '埔心火車站'],
                schools: ['瑞坪國中', '楊光國中小學', '瑞塘國小'],
                market: '萬大黃昏市場',
                park: '柚子公園'
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
        console.log(`   社區: ${data.community}`);
        console.log(`   格局: ${data.layout}`);
        console.log(`   總坪數: ${data.total_area}`);
        console.log(`   樓層: ${data.floor}`);
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
