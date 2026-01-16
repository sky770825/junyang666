// 直接新增測試物件到 Supabase
// 可以在瀏覽器控制台執行，或載入此腳本

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

// 測試物件資料
const testProperties = [
    {
        title: '測試物件 - 精裝2房+車位',
        type: '2房',
        city: '桃園市',
        district: '桃園區',
        address_detail: '中正路123號10樓',
        price: '898萬',
        layout: '2房2廳1衛',
        total_area: '35.5坪',
        building_type: '電梯大樓',
        is_published: true,
        status: 'new',
        status_text: '新上架',
        description: '這是一個自動生成的測試物件，用於測試系統功能。',
        community: '測試社區',
        main_area: '25坪',
        auxiliary_area: '3坪',
        common_area: '7.5坪',
        age: '5年',
        floor: '10/15樓',
        orientation: '東南',
        management_fee: '2,500元/月',
        parking_type: '坡道平面',
        parking_space: 'B2-15',
        current_status: '空屋'
    },
    {
        title: '測試物件 - 溫馨3房',
        type: '3房',
        city: '桃園市',
        district: '中壢區',
        address_detail: '中山路456號8樓',
        price: '1,280萬',
        layout: '3房2廳2衛',
        total_area: '48.2坪',
        building_type: '華廈公寓',
        is_published: true,
        status: 'new',
        status_text: '新上架',
        description: '另一個測試物件，用於驗證系統功能。',
        community: '測試大樓',
        main_area: '32坪',
        auxiliary_area: '4坪',
        common_area: '12.2坪',
        age: '8年',
        floor: '8/12樓',
        orientation: '西南',
        management_fee: '3,200元/月',
        parking_type: '坡道機械',
        parking_space: 'B1-08',
        current_status: '空屋'
    },
    {
        title: '測試物件 - 精緻套房',
        type: '套房',
        city: '桃園市',
        district: '楊梅區',
        address_detail: '新興路789號5樓',
        price: '388萬',
        layout: '套房1廳1衛',
        total_area: '12.8坪',
        building_type: '電梯大樓',
        is_published: false, // 這個設為下架，測試下架功能
        status: '',
        status_text: '',
        description: '測試下架功能的物件。',
        community: '測試套房社區',
        main_area: '10坪',
        auxiliary_area: '1坪',
        common_area: '1.8坪',
        age: '3年',
        floor: '5/10樓',
        orientation: '南',
        management_fee: '1,200元/月',
        parking_type: '無',
        parking_space: '',
        current_status: '空屋'
    }
];

// 生成物件編號
function generatePropertyNumber(type, index) {
    const prefixMap = {
        '套房': 'S',
        '2房': 'A',
        '3房': 'B',
        '4房': 'C'
    };
    const prefix = prefixMap[type] || 'X';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${String(index + 1).padStart(3, '0')}-${timestamp}`;
}

// 新增測試物件
async function createTestProperties() {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 未載入，請先載入 Supabase SDK');
        return;
    }
    
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('🚀 開始新增測試物件...');
    
    const results = [];
    
    for (let i = 0; i < testProperties.length; i++) {
        const testData = testProperties[i];
        
        try {
            // 組合完整地址
            const fullAddress = testData.city + testData.district + testData.address_detail;
            
            // 生成編號
            const propertyNumber = generatePropertyNumber(testData.type, i);
            
            const propertyData = {
                number: propertyNumber,
                title: testData.title,
                type: testData.type,
                city: testData.city,
                district: testData.district,
                address: fullAddress,
                address_detail: testData.address_detail,
                price: testData.price,
                layout: testData.layout,
                total_area: testData.total_area,
                building_type: testData.building_type,
                is_published: testData.is_published,
                status: testData.status || null,
                status_text: testData.status_text || null,
                description: testData.description,
                community: testData.community,
                main_area: testData.main_area,
                auxiliary_area: testData.auxiliary_area,
                common_area: testData.common_area,
                age: testData.age,
                floor: testData.floor,
                orientation: testData.orientation,
                management_fee: testData.management_fee,
                parking_type: testData.parking_type,
                parking_space: testData.parking_space,
                current_status: testData.current_status,
                images: [],
                transportation: {},
                features: []
            };
            
            console.log(`📤 [${i + 1}/${testProperties.length}] 新增物件: ${propertyData.title}`);
            
            const { data, error } = await supabaseClient
                .from('properties')
                .insert([propertyData])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`✅ [${i + 1}/${testProperties.length}] 新增成功:`, {
                id: data.id,
                number: data.number,
                title: data.title,
                is_published: data.is_published
            });
            
            results.push({
                success: true,
                data: data
            });
            
        } catch (error) {
            console.error(`❌ [${i + 1}/${testProperties.length}] 新增失敗:`, error);
            results.push({
                success: false,
                error: error.message
            });
        }
        
        // 稍微延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 顯示結果摘要
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 新增結果摘要:');
    console.log(`✅ 成功: ${successCount} 個`);
    console.log(`❌ 失敗: ${failCount} 個`);
    
    if (successCount > 0) {
        console.log('\n✅ 新增成功的物件:');
        results.forEach((result, index) => {
            if (result.success) {
                const data = result.data;
                console.log(`  ${index + 1}. ${data.title} (${data.number}) - ${data.is_published ? '✅ 已上架' : '❌ 已下架'}`);
            }
        });
    }
    
    if (failCount > 0) {
        console.log('\n❌ 新增失敗的物件:');
        results.forEach((result, index) => {
            if (!result.success) {
                console.log(`  ${index + 1}. ${testProperties[index].title} - ${result.error}`);
            }
        });
    }
    
    return results;
}

// 如果是在瀏覽器環境，自動執行
if (typeof window !== 'undefined') {
    // 等待 Supabase SDK 載入
    if (typeof supabase !== 'undefined') {
        console.log('✅ Supabase SDK 已載入，可以執行 createTestProperties() 來新增測試物件');
    } else {
        console.log('⏳ 等待 Supabase SDK 載入...');
        // 如果 SDK 還沒載入，等待一下
        setTimeout(() => {
            if (typeof supabase !== 'undefined') {
                console.log('✅ Supabase SDK 已載入，可以執行 createTestProperties() 來新增測試物件');
            } else {
                console.error('❌ Supabase SDK 未載入，請先載入 Supabase SDK');
            }
        }, 1000);
    }
}

// 導出函數供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTestProperties, testProperties };
}
