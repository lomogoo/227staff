// Supabase設定（ここに実際の値を入力してください）
const SUPABASE_URL = 'https://hccairtzksnnqdujalgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjY2FpcnR6a3NubnFkdWphbGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjI2MTYsImV4cCI6MjA2NDgzODYxNn0.TVDucIs5ClTWuykg_fy4yv65Rg-xbSIPFIfvIYawy_k';

let supabase;
let settings = {
    curryPrice: 800,
    curryCost: 250,
    costRate: 31.25,
    hourlyWage: 1500
};

// 管理者モード用変数
let titleClickCount = 0;
let titleClickTimer = null;

// 売上管理用変数
let salesData = {
    count: 0,
    totalAmount: 0
};

// 初期化
async function init() {
    // Supabase初期化
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        await loadSettings();
    } else {
        loadLocalSettings();
    }

    // 売上データを読み込み
    loadSalesData();

    // 管理者モード: タイトルを5回タップで開く
    document.getElementById('appTitle').addEventListener('click', handleTitleClick);

    // ナビゲーションの初期化
    initNavigation();

    // デフォルトで計算機セクションを表示
    switchSection('calculator');
}

// ナビゲーション初期化
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

// セクション切り替え
function switchSection(sectionName) {
    // すべてのセクションを非表示
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // すべてのナビアイテムを非アクティブ
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // 選択されたセクションを表示
    document.getElementById(sectionName).classList.add('active');

    // 選択されたナビアイテムをアクティブ
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // ヘッダーテキストを更新
    const headerText = document.querySelector('.header p');
    if (sectionName === 'calculator') {
        headerText.textContent = 'Daily Break-Even Calculator';
    } else if (sectionName === 'sales') {
        headerText.textContent = 'Sales Management';
    }
}

// タイトルクリックハンドラー（管理者モード起動）
function handleTitleClick() {
    titleClickCount++;

    // タイマーをクリア
    if (titleClickTimer) {
        clearTimeout(titleClickTimer);
    }

    // 5回クリックで管理者モード起動
    if (titleClickCount >= 5) {
        openAdminModal();
        titleClickCount = 0;
        return;
    }

    // 2秒後にカウントをリセット
    titleClickTimer = setTimeout(() => {
        titleClickCount = 0;
    }, 2000);
}

// 管理者モーダルを開く
function openAdminModal() {
    document.getElementById('adminModal').classList.add('active');
    displayAdminSettings();
}

// 管理者モーダルを閉じる
function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

// 管理者設定を表示
function displayAdminSettings() {
    document.getElementById('adminCurryPrice').value = settings.curryPrice;
    document.getElementById('adminCurryCost').value = settings.curryCost;
    document.getElementById('adminCostRate').value = settings.costRate;
    document.getElementById('adminHourlyWage').value = settings.hourlyWage;
}

// 管理者設定の保存
async function saveAdminSettings() {
    settings = {
        curryPrice: parseFloat(document.getElementById('adminCurryPrice').value) || 0,
        curryCost: parseFloat(document.getElementById('adminCurryCost').value) || 0,
        costRate: parseFloat(document.getElementById('adminCostRate').value) || 0,
        hourlyWage: parseFloat(document.getElementById('adminHourlyWage').value) || 0
    };

    const messageDiv = document.getElementById('adminSaveMessage');

    if (supabase) {
        try {
            const { error } = await supabase
                .from('curry_settings')
                .insert([{
                    curry_price: settings.curryPrice,
                    curry_cost: settings.curryCost,
                    cost_rate: settings.costRate,
                    hourly_wage: settings.hourlyWage
                }]);

            if (error) throw error;

            messageDiv.innerHTML = '<div class="alert">✓ 設定をSupabaseに保存しました</div>';
        } catch (error) {
            console.error('保存エラー:', error);
            saveLocalSettings();
            messageDiv.innerHTML = '<div class="alert">✓ 設定をローカルに保存しました</div>';
        }
    } else {
        saveLocalSettings();
        messageDiv.innerHTML = '<div class="alert">✓ 設定を保存しました（Supabase未接続）</div>';
    }

    setTimeout(() => {
        messageDiv.innerHTML = '';
        closeAdminModal();
    }, 2000);

    calculate();
    updateSalesDisplay();
}

// 設定の読み込み（Supabase）
async function loadSettings() {
    try {
        const { data, error } = await supabase
            .from('curry_settings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            settings = {
                curryPrice: data.curry_price,
                curryCost: data.curry_cost,
                costRate: data.cost_rate,
                hourlyWage: data.hourly_wage
            };
        }
    } catch (error) {
        console.log('設定の読み込みをスキップ:', error);
        loadLocalSettings();
    }
}

// ローカルストレージから読み込み
function loadLocalSettings() {
    const saved = localStorage.getItem('currySettings');
    if (saved) {
        settings = JSON.parse(saved);
    }
}

// ローカルストレージに保存
function saveLocalSettings() {
    localStorage.setItem('currySettings', JSON.stringify(settings));
}

// 販売場所の小分類を更新
function updateLocationSubcategory() {
    const category = document.getElementById('locationCategory').value;
    const subcategorySelect = document.getElementById('locationSubcategory');

    let options = [];
    if (category === 'event') {
        options = [
            { value: '', text: '選択してください' },
            { value: 'festival', text: 'フェスティバル' },
            { value: 'market', text: 'マーケット' },
            { value: 'exhibition', text: '展示会' },
            { value: 'conference', text: 'カンファレンス' }
        ];
    } else if (category === 'spot') {
        options = [
            { value: '', text: '選択してください' },
            { value: 'station', text: '駅前' },
            { value: 'park', text: '公園' },
            { value: 'shopping', text: '商業施設' },
            { value: 'street', text: '繁華街' }
        ];
    }

    subcategorySelect.innerHTML = options
        .map(opt => `<option value="${opt.value}">${opt.text}</option>`)
        .join('');
}

// 損益分岐点計算
function calculate() {
    const workHours = parseFloat(document.getElementById('workHours').value) || 0;
    const targetSalesAmount = parseFloat(document.getElementById('targetSalesAmount').value) || 0;

    if (workHours === 0) {
        document.getElementById('calculationResult').innerHTML = '';
        return;
    }

    // 基本計算
    const laborCost = settings.hourlyWage * workHours;
    const profitPerCup = settings.curryPrice - settings.curryCost;
    const breakEvenCups = Math.ceil(laborCost / profitPerCup);
    const breakEvenSales = breakEvenCups * settings.curryPrice;

    // 売上目標がある場合の計算
    let targetCupsHTML = '';
    let targetSalesGrossProfit = 0;
    if (targetSalesAmount > 0) {
        targetSalesGrossProfit = targetSalesAmount * (1 - settings.costRate / 100);
        const requiredGrossProfit = laborCost + targetSalesGrossProfit;
        const targetCups = Math.ceil(requiredGrossProfit / profitPerCup);

        targetCupsHTML = `
            <div class="result-card" style="margin-top: 16px;">
                <h3>目標売上達成に必要な杯数</h3>
                <div class="value">${targetCups}<span class="unit">杯</span></div>
                <div class="subtitle">売上 ¥${targetSalesAmount.toLocaleString()}</div>
            </div>
        `;
    }

    // 参考情報セクション
    let referenceHTML = '';
    if (targetSalesAmount > 0) {
        referenceHTML = `
            <div class="reference-info">
                <h4>参考情報</h4>
                <div class="reference-grid">
                    <div class="reference-card">
                        <div class="label">人件費</div>
                        <div class="value">¥${laborCost.toLocaleString()}</div>
                    </div>
                    <div class="reference-card">
                        <div class="label">1杯あたり粗利</div>
                        <div class="value">¥${profitPerCup}</div>
                    </div>
                    <div class="reference-card">
                        <div class="label">目標売上での粗利</div>
                        <div class="value">¥${targetSalesGrossProfit.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        referenceHTML = `
            <div class="reference-info">
                <h4>参考情報</h4>
                <div class="reference-grid">
                    <div class="reference-card">
                        <div class="label">人件費</div>
                        <div class="value">¥${laborCost.toLocaleString()}</div>
                    </div>
                    <div class="reference-card">
                        <div class="label">1杯あたり粗利</div>
                        <div class="value">¥${profitPerCup}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 結果表示
    document.getElementById('calculationResult').innerHTML = `
        <div class="result-card">
            <h3>損益分岐点（赤字回避）</h3>
            <div class="value">${breakEvenCups}<span class="unit">杯</span></div>
            <div class="subtitle">売上 ¥${breakEvenSales.toLocaleString()}</div>
            <div class="info-grid" style="margin-top: 16px;">
                <div class="info-card">
                    <div class="label">人件費</div>
                    <div class="value">¥${laborCost.toLocaleString()}</div>
                </div>
                <div class="info-card">
                    <div class="label">粗利</div>
                    <div class="value">¥${(breakEvenCups * profitPerCup).toLocaleString()}</div>
                </div>
            </div>
        </div>

        ${targetCupsHTML}

        ${referenceHTML}
    `;
}

// 売上管理機能
function incrementCount() {
    salesData.count++;
    salesData.totalAmount = salesData.count * settings.curryPrice;
    saveSalesData();
    updateSalesDisplay();
}

function decrementCount() {
    if (salesData.count > 0) {
        salesData.count--;
        salesData.totalAmount = salesData.count * settings.curryPrice;
        saveSalesData();
        updateSalesDisplay();
    }
}

function resetSales() {
    if (confirm('売上データをリセットしますか？')) {
        salesData = {
            count: 0,
            totalAmount: 0
        };
        saveSalesData();
        updateSalesDisplay();
    }
}

function updateSalesDisplay() {
    document.getElementById('salesAmount').textContent = salesData.totalAmount.toLocaleString();
    document.getElementById('salesCount').textContent = salesData.count;
}

function loadSalesData() {
    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('salesDate');

    // 日付が変わっていたらリセット
    if (savedDate !== today) {
        salesData = {
            count: 0,
            totalAmount: 0
        };
        localStorage.setItem('salesDate', today);
        saveSalesData();
    } else {
        const saved = localStorage.getItem('salesData');
        if (saved) {
            salesData = JSON.parse(saved);
        }
    }

    updateSalesDisplay();
}

function saveSalesData() {
    localStorage.setItem('salesData', JSON.stringify(salesData));
}

// モーダル外クリックで閉じる
document.addEventListener('click', function(event) {
    const modal = document.getElementById('adminModal');
    if (event.target === modal) {
        closeAdminModal();
    }
});

// ページ読み込み時に初期化
window.onload = init;
