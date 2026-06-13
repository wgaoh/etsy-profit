// ============================================
// 全局变量
// ============================================
let allOrders = [];
let currentOrders = [];
let currentCurrency = null;
let feeChart = null;
let dailyChart = null;
let currentGroupBy = 'week';

// ============================================
// 初始化事件
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('new-upload-btn').addEventListener('click', resetToUpload);
  document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);

  const tabTableBtn = document.getElementById('tab-table-btn');
  const tabChartsBtn = document.getElementById('tab-charts-btn');
  const tableContent = document.getElementById('tab-table-content');
  const chartsContent = document.getElementById('tab-charts-content');

  if (tabTableBtn && tabChartsBtn && tableContent && chartsContent) {
    tabTableBtn.addEventListener('click', () => {
      tabTableBtn.classList.add('active');
      tabTableBtn.classList.add('text-orange-600', 'border-orange-500', 'bg-orange-50');
      tabChartsBtn.classList.remove('active', 'text-orange-600', 'border-orange-500', 'bg-orange-50');
      tabChartsBtn.classList.add('text-gray-500', 'border-transparent');
      tableContent.classList.remove('hidden');
      chartsContent.classList.add('hidden');
    });
    tabChartsBtn.addEventListener('click', () => {
      tabChartsBtn.classList.add('active');
      tabChartsBtn.classList.add('text-orange-600', 'border-orange-500', 'bg-orange-50');
      tabTableBtn.classList.remove('active', 'text-orange-600', 'border-orange-500', 'bg-orange-50');
      tabTableBtn.classList.add('text-gray-500', 'border-transparent');
      chartsContent.classList.remove('hidden');
      tableContent.classList.add('hidden');
      renderChart();
      renderDailyChart();
    });
  }

  document.getElementById('group-day').addEventListener('click', () => switchGroup('day'));
  document.getElementById('group-week').addEventListener('click', () => switchGroup('week'));
  document.getElementById('group-month').addEventListener('click', () => switchGroup('month'));
});

function switchGroup(group) {
  currentGroupBy = group;
  document.querySelectorAll('.group-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-orange-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-600');
  });
  const activeBtn = document.getElementById(`group-${group}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-gray-200', 'text-gray-600');
    activeBtn.classList.add('bg-orange-500', 'text-white');
  }
  renderDailyChart();
}

// ============================================
// SKU 成本记忆 (localStorage)
// ============================================
const STORAGE_KEY = 'etsy_profit_sku_costs';

function getStoredCosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredCosts(costs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
  } catch (e) {}
}

function applyStoredCosts(orders) {
  const stored = getStoredCosts();
  if (Object.keys(stored).length === 0) return;
  orders.forEach(order => {
    const sku = order.sku.trim().toLowerCase();
    if (stored[sku]) {
      order.cogs = stored[sku].cogs || 0;
      order.actualShippingCost = stored[sku].shipping || 0;
    }
  });
}

function saveCostToStorage(sku, cogs, shipping) {
  if (!sku) return;
  const stored = getStoredCosts();
  stored[sku.trim().toLowerCase()] = {
    cogs: Math.round(cogs * 100) / 100,
    shipping: Math.round(shipping * 100) / 100
  };
  saveStoredCosts(stored);
}

// ============================================
// 重置
// ============================================
function resetToUpload() {
  document.getElementById('upload-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');
  allOrders = [];
  currentOrders = [];
  currentCurrency = null;
  if (feeChart) { feeChart.destroy(); feeChart = null; }
  if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
  document.getElementById('csv-file').value = '';
}

// ============================================
// 币种切换
// ============================================
function switchCurrency(currency) {
  currentCurrency = currency;
  currentOrders = allOrders.filter(o => (o.currency || 'USD') === currency);
  document.querySelectorAll('.currency-btn').forEach(btn => {
    const btnCurrency = btn.textContent.trim();
    if (btnCurrency === currency) {
      btn.classList.add('bg-orange-500', 'text-white', 'border-orange-500');
      btn.classList.remove('bg-white', 'text-gray-600', 'border-gray-300', 'hover:bg-orange-50');
    } else {
      btn.classList.remove('bg-orange-500', 'text-white', 'border-orange-500');
      btn.classList.add('bg-white', 'text-gray-600', 'border-gray-300', 'hover:bg-orange-50');
    }
  });
  renderAll();
}

// ============================================
// 导出 CSV
// ============================================
function exportToCSV() {
  if (currentOrders.length === 0) return alert('No data to export.');
  const cur = currentOrders[0].currency;
  let csv = `Date,Item,SKU,Currency,Qty,Est. Net,Etsy Fee,Paymt Fee,Shipping,COGS,Profit\n`;
  currentOrders.forEach(o => {
    csv += `"${o.date}","${o.itemName}","${o.sku}",${cur},${o.quantity},${o.estimatedNet.toFixed(2)},${o.etsyPlatformFee.toFixed(2)},${o.paymentProcessingFee.toFixed(2)},${o.actualShippingCost.toFixed(2)},${o.cogs.toFixed(2)},${o.profit.toFixed(2)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'etsy_profit_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// 示例 CSV 下载
// ============================================
function downloadSampleCSV() {
  const sample = `Sale Date,Order ID,Item Name,Buyer,Quantity,Price,Coupon Code,Coupon Details,Discount Amount,Shipping Discount,Order Shipping,Order Sales Tax,Item Total,Currency,Transaction ID,Listing ID,Date Paid,Date Shipped,Ship Name,Ship Address1,Ship Address2,Ship City,Ship State,Ship Zipcode,Ship Country,Order Type,Listings Type,Payment Type,InPerson Discount,InPerson Location,VAT Paid by Buyer,SKU
2-Jan 2026,1001,Handmade Mug,John Doe,1,20.00,,,0,0,5.00,2.00,27.00,USD,txn001,list001,2-Jan 2026,3-Jan 2026,John Doe,123 Main St,,Anytown,CA,90210,US,online,physical,Etsy Payments,0,,0,MUG001
3-Jan 2026,1002,Vintage Necklace,Jane Smith,1,35.00,,,0,0,4.50,3.00,42.50,USD,txn002,list002,3-Jan 2026,4-Jan 2026,Jane Smith,45 High St,,London,,SW1 1AA,GB,online,physical,PayPal,0,,0,NECK001`;
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_etsy_orders.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// CSV 上传处理
// ============================================
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    alert('❌ You uploaded an Excel file.\nPlease choose the "CSV" format when downloading from Etsy, then upload again.');
    return;
  }
  if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) {
    alert('❌ You uploaded a compressed file.\nPlease extract the .csv file inside and upload it.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    let text = e.target.result;
    if (text.substring(0, 10).indexOf('PK') !== -1 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.substring(0, 100))) {
      alert('❌ Invalid file format. It may be an Excel or ZIP file.\nPlease download the "Order Items" CSV from Etsy (plain text) and try again.');
      return;
    }

    text = text.replace(/^\uFEFF/, '');
    const sample = text.substring(0, 1024);
    const tabs = (sample.match(/\t/g) || []).length;
    const commas = (sample.match(/,/g) || []).length;
    const delimiter = tabs > commas ? '\t' : ',';

    Papa.parse(text, {
      header: true,
      delimiter: delimiter,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: function(results) {
        if (results.meta.fields) {
          for (let i = 0; i < results.meta.fields.length; i++) {
            results.meta.fields[i] = results.meta.fields[i].replace(/^\uFEFF/, '').trim();
          }
        }
        results.data = results.data.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.replace(/^\uFEFF/, '').trim();
            newRow[cleanKey] = row[key];
          });
          return newRow;
        });

        allOrders = cleanData(results.data);
        if (allOrders.length === 0) {
          alert('❌ No valid orders found.\nPlease make sure you are using the "Order Items" CSV from Etsy.\nCheck the console (F12) for details.');
          return;
        }
        groupByCurrency();
        document.getElementById('results-section').classList.remove('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        renderAll();

        applyFeeSettings();

        const applyFeeBtn = document.getElementById('apply-fees-btn');
        applyFeeBtn.removeEventListener('click', applyFeeSettings);
        applyFeeBtn.addEventListener('click', applyFeeSettings);

        const quickBtn = document.getElementById('apply-quick-sku');
        quickBtn.removeEventListener('click', applyQuickSKU);
        quickBtn.addEventListener('click', applyQuickSKU);

        const batchBtn = document.getElementById('apply-batch-sku');
        batchBtn.removeEventListener('click', applyBatchSKU);
        batchBtn.addEventListener('click', applyBatchSKU);
      },
      error: function(err) {
        alert('CSV parsing failed: ' + err.message);
      }
    });
  };
  reader.readAsText(file);
}

// ============================================
// 费率应用（修复：基于折扣后金额）
// ============================================
function applyFeeSettings() {
  const txnRate = parseFloat(document.getElementById('etsy-txn-rate').value) / 100;
  const listFee = parseFloat(document.getElementById('etsy-list-fee').value);
  const procRate = parseFloat(document.getElementById('pay-proc-rate').value) / 100;
  const procFixed = parseFloat(document.getElementById('pay-fixed-fee').value);

  currentOrders.forEach(order => {
    const discountedPrice = order.price * order.quantity - order.discountAmount;
    order.etsyPlatformFee = Math.round((discountedPrice * txnRate + listFee * order.quantity) * 100) / 100;
    order.paymentProcessingFee = Math.round((order.itemTotal * procRate + procFixed) * 100) / 100;
  });
  renderAll();
}

// ============================================
// SKU 成本应用
// ============================================
function applyCostBySKU(sku, cogs, shipping) {
  const targetSKU = sku.trim().toLowerCase();
  if (!targetSKU) return;
  let count = 0;
  const roundedCogs = Math.round((cogs || 0) * 100) / 100;
  const roundedShipping = Math.round((shipping || 0) * 100) / 100;
  currentOrders.forEach(order => {
    if (order.sku.trim().toLowerCase() === targetSKU) {
      order.cogs = roundedCogs;
      order.actualShippingCost = roundedShipping;
      count++;
    }
  });
  if (count === 0) alert(`No orders found with SKU: ${sku}`);
  else saveCostToStorage(targetSKU, roundedCogs, roundedShipping);
}

function applyQuickSKU() {
  const sku = document.getElementById('quick-sku').value;
  const cogs = parseFloat(document.getElementById('quick-cogs').value) || 0;
  const shipping = parseFloat(document.getElementById('quick-shipping').value) || 0;
  if (!sku) { alert('Please enter a SKU.'); return; }
  applyCostBySKU(sku, cogs, shipping);
  renderAll();
}

function applyBatchSKU() {
  const text = document.getElementById('batch-sku-text').value.trim();
  if (!text) { alert('Please paste SKU,COGS,Shipping lines.'); return; }
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let applied = 0;
  lines.forEach(line => {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      applyCostBySKU(parts[0], parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0);
      applied++;
    }
  });
  if (applied === 0) alert('No valid lines found. Format: SKU,COGS,Shipping per line.');
  else renderAll();
}

// ============================================
// 数据清洗
// ============================================
function cleanData(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  let orderIdKey = null;
  for (let k of keys) {
    if (k.toLowerCase().replace(/\s/g, '') === 'orderid') {
      orderIdKey = k;
      break;
    }
  }
  if (!orderIdKey) { console.error('找不到 Order ID 列', keys); return []; }

  const keyMap = {};
  const needed = {
    quantity: 'Quantity',
    price: 'Price',
    discount: 'Discount Amount',
    shipping: 'Order Shipping',
    salestax: 'Order Sales Tax',
    itemtotal: 'Item Total',
    currency: 'Currency',
    name: 'Item Name',
    sku: 'SKU',
    saledate: 'Sale Date'
  };

  for (let [prop, expected] of Object.entries(needed)) {
    for (let k of keys) {
      if (k.replace(/\s/g, '').toLowerCase() === expected.replace(/\s/g, '').toLowerCase()) {
        keyMap[prop] = k;
        break;
      }
    }
    if (!keyMap[prop]) {
      for (let k of keys) {
        if (k.toLowerCase().includes(expected.toLowerCase().replace(/\s/g, ''))) {
          keyMap[prop] = k;
          break;
        }
      }
    }
  }

  const getVal = (prop, r) => {
    const col = keyMap[prop];
    if (!col || r[col] === undefined) return 0;
    return parseFloat(r[col].toString().replace(/[$,]/g, '')) || 0;
  };
  const getStr = (prop, r) => {
    const col = keyMap[prop];
    if (!col || r[col] === undefined) return '';
    return r[col].toString().trim();
  };

  const result = rows
    .filter(r => r[orderIdKey] && r[orderIdKey].toString().trim() !== '')
    .map(r => {
      const qty = parseInt(r[keyMap.quantity] || '1') || 1;
      const price = getVal('price', r);
      const itemTotal = getVal('itemtotal', r);
      const shippingPaid = getVal('shipping', r);
      const salesTax = getVal('salestax', r);
      const discountAmount = getVal('discount', r);
      let currency = getStr('currency', r).toUpperCase();
      if (!currency || currency.length !== 3) currency = 'USD';

      const estimatedNet = Math.round((itemTotal - shippingPaid - salesTax) * 100) / 100;

      let dateObj = null;
      const rawDate = getStr('saledate', r);
      const partsDash = rawDate.split('-');
      if (partsDash.length === 3) {
        const day = parseInt(partsDash[0]);
        const monthStr = partsDash[1];
        const year = parseInt(partsDash[2]);
        const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
        if (!isNaN(day) && months[monthStr] !== undefined && !isNaN(year)) {
          dateObj = new Date(year, months[monthStr], day);
        }
      }
      if (!dateObj && rawDate) dateObj = new Date(rawDate);
      if (dateObj && isNaN(dateObj.getTime())) dateObj = null;

      return {
        orderId: r[orderIdKey].toString().trim(),
        date: dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : rawDate,
        dateObj: dateObj,
        itemName: getStr('name', r),
        sku: getStr('sku', r),
        currency: currency,
        quantity: qty,
        price: price,
        itemTotal: itemTotal,
        discountAmount: discountAmount,
        salesTax: salesTax,
        shippingPaid: shippingPaid,
        estimatedNet: estimatedNet,
        etsyPlatformFee: 0,
        paymentProcessingFee: 0,
        actualShippingCost: 0,
        cogs: 0,
        get totalFees() {
          return Math.round((this.etsyPlatformFee + this.paymentProcessingFee) * 100) / 100;
        },
        get netRevenue() {
          return Math.round((this.estimatedNet - this.totalFees) * 100) / 100;
        },
        get profit() {
          return Math.round((this.netRevenue - this.actualShippingCost - (this.cogs * this.quantity)) * 100) / 100;
        }
      };
    });

  applyStoredCosts(result);
  return result;
}

// ============================================
// 币种分组
// ============================================
function groupByCurrency() {
  const byCurrency = {};
  allOrders.forEach(o => {
    const cur = o.currency || 'USD';
    if (!byCurrency[cur]) byCurrency[cur] = [];
    byCurrency[cur].push(o);
  });
  const currencies = Object.keys(byCurrency).filter(c => c.trim() !== '');
  if (currencies.length === 0) return;
  currencies.sort((a, b) => byCurrency[b].length - byCurrency[a].length);
  currentCurrency = currencies[0];
  currentOrders = byCurrency[currentCurrency];

  const alertDiv = document.getElementById('currency-alert');
  if (alertDiv) {
    if (currencies.length > 1) {
      alertDiv.innerHTML = `⚠️ Detected ${currencies.length} different currencies. Currently showing <strong>${currentCurrency}</strong> orders.`;
      alertDiv.classList.remove('hidden');
    } else {
      alertDiv.classList.add('hidden');
    }
  }

  const switcherDiv = document.getElementById('currency-switcher');
  const buttonsDiv = document.getElementById('currency-buttons');
  if (switcherDiv && buttonsDiv) {
    if (currencies.length > 1) {
      buttonsDiv.innerHTML = currencies.map(c => 
        `<button class="currency-btn px-3 py-1 text-xs rounded-full border transition-colors
          ${c === currentCurrency ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'}"
          onclick="switchCurrency('${c}')">${c}</button>`
      ).join('');
      switcherDiv.classList.remove('hidden');
    } else {
      switcherDiv.classList.add('hidden');
    }
  }
}

// ============================================
// 更新单个费用
// ============================================
function updateCost(orderId, field, value) {
  const order = currentOrders.find(o => o.orderId === orderId);
  if (!order) return;
  order[field] = Math.round((parseFloat(value) || 0) * 100) / 100;

  if (field === 'cogs' || field === 'actualShippingCost') {
    saveCostToStorage(order.sku, order.cogs, order.actualShippingCost);
  }

  const profitCell = document.getElementById(`profit-${orderId}`);
  if (profitCell) {
    profitCell.textContent = `${order.currency} ${order.profit.toFixed(2)}`;
  }
  renderSummary();
  renderChart();
  renderDailyChart();
  renderSKUSummary();
}

// ============================================
// 概览卡片
// ============================================
function renderSummary() {
  if (currentOrders.length === 0) return;
  const cur = currentOrders[0].currency;

  const totalEstimatedNet = currentOrders.reduce((s, o) => s + o.estimatedNet, 0);
  const totalEtsyFees = currentOrders.reduce((s, o) => s + o.etsyPlatformFee, 0);
  const totalPaymentFees = currentOrders.reduce((s, o) => s + o.paymentProcessingFee, 0);
  const totalActualShipping = currentOrders.reduce((s, o) => s + o.actualShippingCost, 0);
  const totalCogs = currentOrders.reduce((s, o) => s + o.cogs * o.quantity, 0);
  const netProfit = currentOrders.reduce((s, o) => s + o.profit, 0);
  const totalNetRevenue = currentOrders.reduce((s, o) => s + o.netRevenue, 0);
  const profitMargin = totalNetRevenue > 0 ? (netProfit / totalNetRevenue * 100) : 0;
  const etsyFeeRatio = totalEstimatedNet > 0 ? (totalEtsyFees / totalEstimatedNet * 100) : 0;

  let healthIcon = '';
  if (profitMargin > 30) healthIcon = '🟢';
  else if (profitMargin > 15) healthIcon = '🟡';
  else healthIcon = '🔴';

  let etsyWarning = '';
  if (etsyFeeRatio > 15) etsyWarning = ' ⚠️';

  document.getElementById('summary-cards').innerHTML = `
    <div class="bg-white rounded-2xl p-5 shadow-sm card-gradient text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Est. Net (Before Fees)</p>
      <p class="text-2xl font-bold text-gray-800">${cur} ${totalEstimatedNet.toFixed(2)}</p>
    </div>
    <div class="bg-white rounded-2xl p-5 shadow-sm card-gradient text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Etsy Fees${etsyWarning}</p>
      <p class="text-2xl font-bold text-orange-500">${cur} ${totalEtsyFees.toFixed(2)}</p>
      <p class="text-xs text-gray-400">${etsyFeeRatio.toFixed(1)}% of net</p>
    </div>
    <div class="bg-white rounded-2xl p-5 shadow-sm card-gradient text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment Fees</p>
      <p class="text-2xl font-bold text-orange-500">${cur} ${totalPaymentFees.toFixed(2)}</p>
    </div>
    <div class="bg-white rounded-2xl p-5 shadow-sm card-gradient text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ship + COGS</p>
      <p class="text-2xl font-bold text-orange-500">${cur} ${(totalActualShipping + totalCogs).toFixed(2)}</p>
    </div>
    <div class="rounded-2xl p-5 shadow-sm text-center highlight-card text-white">
      <p class="text-xs text-orange-100 uppercase tracking-wide mb-1">Net Profit ${healthIcon}</p>
      <p class="text-2xl font-bold">${cur} ${netProfit.toFixed(2)}</p>
      <p class="text-xs text-orange-100">Margin: ${profitMargin.toFixed(1)}%</p>
    </div>
  `;
}

// ============================================
// 饼图
// ============================================
function renderChart() {
  if (currentOrders.length === 0) return;
  const totalEtsyFees = currentOrders.reduce((s, o) => s + o.etsyPlatformFee, 0);
  const totalPaymentFees = currentOrders.reduce((s, o) => s + o.paymentProcessingFee, 0);

  const ctx = document.getElementById('fees-chart').getContext('2d');
  if (feeChart) feeChart.destroy();
  feeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Etsy Platform Fees', 'Payment Processing'],
      datasets: [{
        data: [totalEtsyFees, totalPaymentFees],
        backgroundColor: ['#f97316', '#fb923c']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ============================================
// 柱状图
// ============================================
function renderDailyChart() {
  if (currentOrders.length === 0) return;

  const aggregated = {};
  const groupBy = currentGroupBy;

  currentOrders.forEach(o => {
    if (!o.dateObj) return;
    const d = o.dateObj;
    let key;
    if (groupBy === 'day') {
      key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (groupBy === 'week') {
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' week';
    } else if (groupBy === 'month') {
      key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (!aggregated[key]) {
      aggregated[key] = { profit: 0, date: d };
    }
    aggregated[key].profit += o.profit;
  });

  const entries = Object.entries(aggregated).sort((a, b) => a[1].date - b[1].date);
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => Math.round(e[1].profit * 100) / 100);

  const ctx = document.getElementById('daily-chart').getContext('2d');
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Net Profit (' + currentCurrency + ')',
        data: values,
        backgroundColor: '#f97316',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxRotation: 45, autoSkip: true } },
        y: { beginAtZero: true }
      }
    }
  });
}

// ============================================
// 订单表格（修复利润率颜色基于 netRevenue）
// ============================================
function renderOrderTable() {
  document.getElementById('orders-body').innerHTML = currentOrders.map(o => {
    const feePercent = o.estimatedNet > 0 ? (o.etsyPlatformFee / o.estimatedNet * 100).toFixed(0) : 0;
    const profitMargin = o.netRevenue > 0 ? (o.profit / o.netRevenue) * 100 : 0;
    let rowClass = '';
    if (profitMargin > 30) rowClass = 'profit-high';
    else if (profitMargin > 10) rowClass = 'profit-mid';
    else rowClass = 'profit-low';

    return `
    <tr class="border-b border-gray-100 hover:bg-orange-50 transition-colors ${rowClass}">
      <td class="py-2 px-2 text-xs text-gray-600 whitespace-nowrap">${o.date}</td>
      <td class="py-2 px-2 text-xs text-gray-800 max-w-0 truncate" title="${o.itemName}">${o.itemName}</td>
      <td class="py-2 px-2 text-xs text-gray-500 max-w-0 truncate" title="${o.sku}">${o.sku || '-'}</td>
      <td class="py-2 px-2 text-xs text-center text-gray-600">${o.quantity}</td>
      <td class="py-2 px-2 text-xs text-right text-gray-800 font-medium">${o.currency} ${o.estimatedNet.toFixed(2)}</td>
      <td class="py-2 px-1 text-right">
        <input type="number" step="0.01" min="0" value="${o.etsyPlatformFee.toFixed(2)}"
          class="w-16 border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-200"
          onchange="updateCost('${o.orderId}', 'etsyPlatformFee', this.value)"
          title="Etsy Fee"><span class="text-xs text-gray-400 ml-1">${feePercent}%</span>
      </td>
      <td class="py-2 px-1 text-right">
        <input type="number" step="0.01" min="0" value="${o.paymentProcessingFee.toFixed(2)}"
          class="w-16 border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-200"
          onchange="updateCost('${o.orderId}', 'paymentProcessingFee', this.value)"
          title="Payment Processing Fee">
      </td>
      <td class="py-2 px-1 text-right">
        <input type="number" step="0.01" min="0" value="${o.actualShippingCost.toFixed(2)}"
          class="w-16 border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-200"
          onchange="updateCost('${o.orderId}', 'actualShippingCost', this.value)">
      </td>
      <td class="py-2 px-1 text-right">
        <input type="number" step="0.01" min="0" value="${o.cogs.toFixed(2)}"
          class="w-16 border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-200"
          onchange="updateCost('${o.orderId}', 'cogs', this.value)">
      </td>
      <td class="py-2 px-2 text-xs text-right font-semibold font-mono whitespace-nowrap ${o.profit >= 0 ? 'text-green-600' : 'text-red-600'}" id="profit-${o.orderId}">
        ${o.currency} ${o.profit.toFixed(2)}
      </td>
    </tr>
  `}).join('');
}

// ============================================
// SKU 汇总 + 排行榜（修复利润率基于 netRevenue）
// ============================================
function renderSKUSummary() {
  const skuMap = {};
  currentOrders.forEach(o => {
    const sku = o.sku || 'N/A';
    if (!skuMap[sku]) {
      skuMap[sku] = { units: 0, revenue: 0, cogsTotal: 0, profit: 0, netRevenue: 0 };
    }
    skuMap[sku].units += o.quantity;
    skuMap[sku].revenue += o.estimatedNet;
    skuMap[sku].cogsTotal += o.cogs * o.quantity;
    skuMap[sku].profit += o.profit;
    skuMap[sku].netRevenue += o.netRevenue;
  });

  document.getElementById('sku-summary-body').innerHTML = Object.entries(skuMap).map(([sku, data]) => {
    const margin = data.netRevenue > 0 ? (data.profit / data.netRevenue * 100).toFixed(1) : 0;
    return `
      <tr class="border-b border-gray-100">
        <td class="py-2 px-3 text-xs">${sku}</td>
        <td class="py-2 px-3 text-xs text-right">${data.units}</td>
        <td class="py-2 px-3 text-xs text-right">${currentCurrency} ${data.revenue.toFixed(2)}</td>
        <td class="py-2 px-3 text-xs text-right">${currentCurrency} ${data.cogsTotal.toFixed(2)}</td>
        <td class="py-2 px-3 text-xs text-right font-semibold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}">${currentCurrency} ${data.profit.toFixed(2)}</td>
        <td class="py-2 px-3 text-xs text-right">${margin}%</td>
      </tr>
    `;
  }).join('');

  renderRankingCards(skuMap);
}

function renderRankingCards(skuMap) {
  const entries = Object.entries(skuMap)
    .filter(([sku]) => sku !== 'N/A')
    .map(([sku, data]) => ({
      sku,
      ...data,
      margin: data.netRevenue > 0 ? (data.profit / data.netRevenue) * 100 : 0
    }))
    .filter(item => item.revenue > 0);

  if (entries.length === 0) {
    document.getElementById('ranking-cards').innerHTML = '';
    return;
  }

  const avgMargin = entries.reduce((sum, e) => sum + e.margin, 0) / entries.length;

  const top5 = [...entries].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const bottom5 = [...entries].sort((a, b) => {
    if (a.margin !== b.margin) return a.margin - b.margin;
    return a.profit - b.profit;
  }).slice(0, 5);

  const cur = currentOrders[0]?.currency || '';

  const renderCard = (title, items, isGood) => {
    if (items.length === 0) return '';

    return `
      <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h4 class="text-sm font-semibold text-gray-700 mb-4">
          ${title}
        </h4>
        <div class="space-y-2">
          ${items.map((item, idx) => {
            const isNeg = item.profit < 0;
            const profitColor = isNeg ? 'text-red-600' : 'text-green-600';
            const diffFromAvg = (item.margin - avgMargin).toFixed(1);
            return `
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <span class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[11px] flex-shrink-0">${idx+1}</span>
                  <span class="truncate text-gray-700 font-medium" title="${item.sku}">${item.sku}</span>
                </div>
                <div class="text-right ml-3 flex-shrink-0">
                  <span class="font-mono font-semibold ${profitColor}">${cur} ${item.profit.toFixed(2)}</span>
                  <span class="text-gray-400 ml-1">${item.margin.toFixed(1)}%</span>
                  ${!isGood ? `<span class="text-red-400 ml-1">(${diffFromAvg}% vs avg)</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${!isGood ? `
          <div class="mt-4 pt-3 border-t border-gray-200 text-xs text-red-500 text-center font-medium">
            📉 Average Margin: <strong>${avgMargin.toFixed(1)}%</strong>
          </div>
        ` : ''}
      </div>
    `;
  };

  document.getElementById('ranking-cards').innerHTML = 
    renderCard('🏆 Top 5 Products (by Profit)', top5, true) +
    renderCard('⚠️ Bottom 5 Products (by Margin)', bottom5, false);
}

// ============================================
// 总渲染
// ============================================
function renderAll() {
  renderSummary();
  renderChart();
  renderDailyChart();
  renderOrderTable();
  renderSKUSummary();
}